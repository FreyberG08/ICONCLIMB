import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { AdminRepository, ProductListFilter, PublicRepository, UploadFile } from "../repository";
import { DomainError } from "../repository";
import {
  assertPerm, assertStatusChange, buildSearchText, EXPORT_COLUMNS, importProductsWith, relevanceScore, searchTokens,
} from "../shared";
import { db, demoFileUrl, DEMO_UPLOADS, now, persist, uid, type DemoDB, type DemoProduct } from "./store";
import { can } from "../../permissions";
import { fromCents, slugify, toCents } from "../../format";
import type {
  AdminProduct, AdminProductRow, Availability, CatalogProduct, CatalogProductDetail, CatalogQuery, Category,
  DashboardStats, InventoryMovement, InventoryRow, Order, OrderStatus, OrderSummary, PaymentStatus, ProductImage,
  ProductInput, ProductStatus, Quote, QuoteStatus, QuoteSummary, StaffUser, TimelineEvent,
} from "../../types";

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function availabilityOf(d: DemoDB, p: DemoProduct): Availability {
  const inv = d.inventory[p.id] ?? { onHand: 0, reserved: 0 };
  const avail = inv.onHand - inv.reserved;
  if (avail <= 0) return "out_of_stock";
  if (avail <= p.minStock) return "low_stock";
  return "in_stock";
}

function imagesOf(d: DemoDB, productId: string): ProductImage[] {
  return d.images
    .filter((i) => i.productId === productId)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position)
    .map((i) => ({ ...i, url: demoFileUrl(i.storagePath) }));
}

function toCatalog(d: DemoDB, p: DemoProduct): CatalogProduct {
  const c = d.categories.find((x) => x.id === p.categoryId);
  const sc = d.categories.find((x) => x.id === p.subcategoryId);
  const b = d.brands.find((x) => x.id === p.brandId);
  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    categoryId: p.categoryId,
    categoryName: c?.name ?? null,
    categorySlug: c?.slug ?? null,
    subcategoryName: sc?.name ?? null,
    subcategorySlug: sc?.slug ?? null,
    brandId: p.brandId,
    brandName: b?.name ?? null,
    brandSlug: b?.slug ?? null,
    model: p.model,
    reference: p.reference,
    altCodes: p.altCodes,
    shortDescription: p.shortDescription,
    price: p.saleMode === "direct" ? p.price : null,
    currency: p.currency,
    saleMode: p.saleMode,
    featured: p.featured,
    availability: availabilityOf(d, p),
    imageUrl: imagesOf(d, p.id)[0]?.url ?? null,
    publishedAt: p.publishedAt,
  };
}

function published(d: DemoDB) {
  return d.products.filter((p) => p.status === "published");
}

function audit(d: DemoDB, actor: StaffUser | null, action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}) {
  d.audit.unshift({
    id: String(++d.seq.audit),
    actorLabel: actor ? actor.fullName || actor.email : "Sistema",
    action,
    entity,
    entityId,
    details,
    createdAt: now(),
  });
  if (d.audit.length > 5000) d.audit.length = 5000;
}

function event(d: DemoDB, e: Omit<TimelineEvent, "id" | "createdAt">): TimelineEvent {
  return { ...e, id: String(++d.seq.event), createdAt: now() };
}

function yymm() {
  const t = new Date();
  return `${String(t.getFullYear()).slice(2)}${String(t.getMonth() + 1).padStart(2, "0")}`;
}

function diff(before: Record<string, unknown>, after: Record<string, unknown>, hidden: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(after)) {
    if (["updatedAt", "searchText"].includes(k)) continue;
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      out[k] = hidden.includes(k) ? "modificado" : { from: before[k] ?? null, to: after[k] ?? null };
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Repositorio público
// ---------------------------------------------------------------------------
export const demoPublicRepo: PublicRepository = {
  async listCategories() {
    const d = db();
    const pub = published(d);
    return d.categories
      .filter((c) => c.active)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
      .map((c) => ({ ...c, productCount: pub.filter((p) => p.categoryId === c.id || p.subcategoryId === c.id).length }));
  },

  async listBrands() {
    const d = db();
    const pub = published(d);
    return d.brands
      .filter((b) => b.active)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((b) => ({ ...b, productCount: pub.filter((p) => p.brandId === b.id).length }));
  },

  async searchCatalog(q: CatalogQuery) {
    const d = db();
    const tokens = searchTokens(q.q);
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(48, q.pageSize ?? 12);
    let list = published(d).map((p) => ({ p, c: toCatalog(d, p) }));
    if (tokens.length) list = list.filter(({ p }) => tokens.every((t) => p.searchText.includes(t)));
    if (q.category) list = list.filter(({ c }) => c.categorySlug === q.category || c.subcategorySlug === q.category);
    if (q.brand?.length) list = list.filter(({ c }) => c.brandSlug && q.brand!.includes(c.brandSlug));
    if (q.mode) list = list.filter(({ c }) => c.saleMode === q.mode);
    if (q.availability === "available") list = list.filter(({ c }) => c.availability !== "out_of_stock");
    if (q.availability === "unavailable") list = list.filter(({ c }) => c.availability === "out_of_stock");
    if (q.minPrice != null) list = list.filter(({ c }) => c.price != null && c.price >= q.minPrice!);
    if (q.maxPrice != null) list = list.filter(({ c }) => c.price != null && c.price <= q.maxPrice!);

    const sort = q.sort ?? "relevance";
    list.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.c.name.localeCompare(b.c.name, "es");
        case "price_asc":
          return (a.c.price ?? Infinity) - (b.c.price ?? Infinity);
        case "price_desc":
          return (b.c.price ?? -Infinity) - (a.c.price ?? -Infinity);
        case "newest":
          return (b.c.publishedAt ?? "").localeCompare(a.c.publishedAt ?? "");
        default: {
          const s = relevanceScore(tokens, b.p) - relevanceScore(tokens, a.p);
          return s || Number(b.c.featured) - Number(a.c.featured) || a.c.name.localeCompare(b.c.name, "es");
        }
      }
    });
    const total = list.length;
    return { items: list.slice((page - 1) * pageSize, page * pageSize).map((x) => x.c), total, page, pageSize };
  },

  async listFeatured(limit) {
    const d = db();
    return published(d).filter((p) => p.featured).slice(0, limit).map((p) => toCatalog(d, p));
  },

  async listNewArrivals(limit) {
    const d = db();
    return published(d)
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .slice(0, limit)
      .map((p) => toCatalog(d, p));
  },

  async getProductBySlug(slug) {
    const d = db();
    const p = published(d).find((x) => x.slug === slug);
    if (!p) return null;
    const base = toCatalog(d, p);
    const related = published(d)
      .filter((x) => x.id !== p.id && x.categoryId === p.categoryId)
      .slice(0, 4)
      .map((x) => toCatalog(d, x));
    const detail: CatalogProductDetail = {
      ...base,
      description: p.description,
      specs: p.specs,
      images: imagesOf(d, p.id),
      documents: d.documents
        .filter((x) => x.productId === p.id && x.isPublic)
        .map(({ storagePath: _s, isPublic: _i, ...x }) => x),
      compatibilities: d.compatibilities.filter((x) => x.productId === p.id && x.verified),
      related,
    };
    return detail;
  },

  async getProductsByIds(ids) {
    const d = db();
    return published(d).filter((p) => ids.includes(p.id)).map((p) => toCatalog(d, p));
  },

  async listPublishedForSitemap() {
    return published(db()).map((p) => ({ slug: p.slug, updatedAt: p.updatedAt }));
  },

  // Misma semántica que public.create_order: valida todo y reserva de forma atómica.
  async createOrder(items, customer) {
    const d = db();
    const grouped = new Map<string, number>();
    for (const it of items) grouped.set(it.productId, (grouped.get(it.productId) ?? 0) + it.quantity);
    let currency: string | null = null;
    const lines: Order["items"] = [];
    for (const [productId, quantity] of grouped) {
      const p = d.products.find((x) => x.id === productId);
      if (!p || p.status !== "published") throw new DomainError("Un producto del carrito ya no está disponible", "conflict");
      if (p.saleMode !== "direct" || !p.price || p.price <= 0) throw new DomainError(`El producto ${p.sku} requiere cotización`);
      if (currency && currency !== p.currency) throw new DomainError("El carrito contiene productos en monedas distintas");
      currency = p.currency;
      const inv = d.inventory[p.id];
      const available = inv.onHand - inv.reserved;
      if (available < quantity) {
        throw new DomainError(`Disponibilidad insuficiente para ${p.sku} (disponible: ${Math.max(available, 0)})`, "conflict");
      }
      lines.push({ productId: p.id, sku: p.sku, name: p.name, unitPrice: p.price, quantity, lineTotal: fromCents(toCents(p.price) * quantity) });
    }
    // Todas las validaciones pasaron: aplicar reservas.
    const number = `ICN-P${yymm()}-${String(++d.seq.order).padStart(5, "0")}`;
    const t = now();
    for (const l of lines) {
      const inv = d.inventory[l.productId!];
      inv.reserved += l.quantity;
      inv.updatedAt = t;
      d.movements.unshift({
        id: String(++d.seq.movement), productId: l.productId!, type: "reservation", onHandDelta: 0, reservedDelta: l.quantity,
        onHandAfter: inv.onHand, reservedAfter: inv.reserved, reason: "Reserva por pedido web", reference: number,
        actorLabel: "Tienda web", createdAt: t,
      });
    }
    const total = fromCents(lines.reduce((s, l) => s + toCents(l.lineTotal), 0));
    const order: Order = {
      id: uid(), number, status: "received", paymentStatus: "pending", stockState: "reserved", customer,
      currency: currency!, subtotal: total, total, items: lines,
      events: [event(d, { kind: "created", fromValue: null, toValue: "received", note: "Pedido registrado desde la tienda web", isInternal: false, actorLabel: "Tienda web" })],
      createdAt: t, updatedAt: t,
    };
    d.orders.unshift(order);
    persist();
    return { number, total, currency: currency! };
  },

  async createQuote(items, customer) {
    const d = db();
    const lines: Quote["items"] = [];
    for (const it of items) {
      if (!it.productId) {
        if (!it.description || it.description.trim().length < 3) throw new DomainError("Describa la pieza que necesita");
        lines.push({ productId: null, sku: "NO-CATALOGADO", name: it.description.trim().slice(0, 200), quantity: it.quantity, notes: it.notes });
        continue;
      }
      const p = d.products.find((x) => x.id === it.productId && x.status === "published");
      if (!p) throw new DomainError("Un producto de la lista ya no está disponible", "conflict");
      lines.push({ productId: p.id, sku: p.sku, name: p.name, quantity: it.quantity, notes: it.notes });
    }
    const number = `ICN-C${yymm()}-${String(++d.seq.quote).padStart(5, "0")}`;
    const t = now();
    d.quotes.unshift({
      id: uid(), number, status: "new", customer, items: lines,
      events: [event(d, { kind: "created", fromValue: null, toValue: "new", note: "Solicitud recibida desde la tienda web", isInternal: false, actorLabel: "Tienda web" })],
      createdAt: t, updatedAt: t,
    });
    persist();
    return { number };
  },

  async track(number, email) {
    const d = db();
    const n = number.trim().toUpperCase();
    const e = email.trim().toLowerCase();
    const o = d.orders.find((x) => x.number === n && x.customer.email.toLowerCase() === e);
    if (o) {
      return {
        kind: "order", number: o.number, status: o.status, paymentStatus: o.paymentStatus, createdAt: o.createdAt,
        total: o.total, currency: o.currency,
        items: o.items.map((i) => ({ sku: i.sku, name: i.name, quantity: i.quantity })),
        events: o.events.filter((x) => !x.isInternal).map((x) => ({ to: x.toValue, note: x.note, at: x.createdAt })),
      };
    }
    const q = d.quotes.find((x) => x.number === n && x.customer.email.toLowerCase() === e);
    if (q) {
      return {
        kind: "quote", number: q.number, status: q.status, createdAt: q.createdAt,
        items: q.items.map((i) => ({ sku: i.sku, name: i.name, quantity: i.quantity })),
        events: q.events.filter((x) => !x.isInternal).map((x) => ({ to: x.toValue, note: x.note, at: x.createdAt })),
      };
    }
    return null;
  },

  async getPublicDocumentUrl(documentId) {
    const d = db();
    const doc = d.documents.find((x) => x.id === documentId && x.isPublic);
    if (!doc) return null;
    const p = d.products.find((x) => x.id === doc.productId);
    if (!p || p.status !== "published") return null;
    return demoFileUrl(doc.storagePath);
  },
};

// ---------------------------------------------------------------------------
// Repositorio administrativo
// ---------------------------------------------------------------------------
function writeUpload(storagePath: string, bytes: Uint8Array) {
  const full = path.join(DEMO_UPLOADS, storagePath);
  if (!full.startsWith(DEMO_UPLOADS)) throw new DomainError("Ruta inválida");
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, bytes);
}

function removeUpload(storagePath: string) {
  try {
    const full = path.join(DEMO_UPLOADS, storagePath);
    if (full.startsWith(DEMO_UPLOADS)) fs.unlinkSync(full);
  } catch {
    /* archivo inexistente */
  }
}

function extOf(name: string, type: string) {
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return type.split("/")[1] ?? "bin";
}

export function createDemoAdminRepo(user: StaffUser): AdminRepository {
  const self: AdminRepository = {
    user,

    async dashboard(): Promise<DashboardStats> {
      assertPerm(user, "catalog.view");
      const d = db();
      const rows = (await self.listProducts({ status: "all", pageSize: 100000 })).items;
      const active = rows.filter((r) => r.status !== "archived");
      const count = (s: ProductStatus) => rows.filter((r) => r.status === s).length;
      const sales = new Map<string, { amount: number; count: number }>();
      for (const o of d.orders.filter((x) => x.paymentStatus === "paid" && x.status !== "cancelled")) {
        const cur = sales.get(o.currency) ?? { amount: 0, count: 0 };
        cur.amount = fromCents(toCents(cur.amount) + toCents(o.total));
        cur.count++;
        sales.set(o.currency, cur);
      }
      const canOrders = can(user.role, "orders.view");
      const canQuotes = can(user.role, "quotes.manage");
      return {
        published: count("published"),
        draft: count("draft"),
        pendingPhotos: count("pending_photos"),
        pendingReview: count("pending_review"),
        archived: count("archived"),
        outOfStock: active.filter((r) => r.onHand - r.reserved <= 0).length,
        lowStock: active.filter((r) => r.onHand - r.reserved > 0 && r.onHand - r.reserved <= r.minStock).length,
        ordersTotal: canOrders ? d.orders.length : 0,
        ordersOpen: canOrders ? d.orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length : 0,
        quotesPending: canQuotes ? d.quotes.filter((q) => ["new", "in_review"].includes(q.status)).length : 0,
        confirmedSales: canOrders ? [...sales].map(([currency, v]) => ({ currency, ...v })) : [],
        recentOrders: canOrders ? (await self.listOrders({ status: "all" })).slice(0, 5) : [],
        recentQuotes: canQuotes ? (await self.listQuotes({ status: "all" })).slice(0, 5) : [],
        attention: rows.filter((r) => ["pending_review", "pending_photos"].includes(r.status)).slice(0, 6),
      };
    },

    async listProducts(f: ProductListFilter) {
      assertPerm(user, "catalog.view");
      const d = db();
      const tokens = searchTokens(f.q);
      const page = Math.max(1, f.page ?? 1);
      const pageSize = f.pageSize ?? 25;
      let list = d.products.slice();
      if (f.status && f.status !== "all") list = list.filter((p) => p.status === f.status);
      else if (!f.status) list = list.filter((p) => p.status !== "archived");
      if (tokens.length) list = list.filter((p) => tokens.every((t) => p.searchText.includes(t)));
      if (f.categoryId) list = list.filter((p) => p.categoryId === f.categoryId || p.subcategoryId === f.categoryId);
      if (f.saleMode) list = list.filter((p) => p.saleMode === f.saleMode);
      const rows: AdminProductRow[] = list.map((p) => {
        const inv = d.inventory[p.id] ?? { onHand: 0, reserved: 0 };
        const imgs = imagesOf(d, p.id);
        return {
          id: p.id, sku: p.sku, name: p.name, status: p.status, saleMode: p.saleMode, price: p.price, currency: p.currency,
          categoryName: d.categories.find((c) => c.id === p.categoryId)?.name ?? null,
          brandName: d.brands.find((b) => b.id === p.brandId)?.name ?? null,
          onHand: inv.onHand, reserved: inv.reserved, minStock: p.minStock,
          imageUrl: imgs[0]?.url ?? null, imageCount: imgs.length, updatedAt: p.updatedAt,
        };
      });
      let filtered = rows;
      if (f.stock === "out") filtered = rows.filter((r) => r.onHand - r.reserved <= 0);
      if (f.stock === "low") filtered = rows.filter((r) => r.onHand - r.reserved > 0 && r.onHand - r.reserved <= r.minStock);
      filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize };
    },

    async getProduct(id) {
      assertPerm(user, "catalog.view");
      const d = db();
      const p = d.products.find((x) => x.id === id);
      if (!p) return null;
      const inv = d.inventory[p.id] ?? { onHand: 0, reserved: 0 };
      const { searchText: _s, cost, ...rest } = p;
      const result: AdminProduct = {
        ...rest,
        cost: can(user.role, "catalog.cost") ? cost : null,
        onHand: inv.onHand,
        reserved: inv.reserved,
        images: imagesOf(d, p.id),
        documents: d.documents.filter((x) => x.productId === p.id),
        compatibilities: d.compatibilities.filter((x) => x.productId === p.id),
      };
      return result;
    },

    async isSkuTaken(sku, exceptId) {
      return db().products.some((p) => p.sku === sku && p.id !== exceptId);
    },

    async createProduct(input: ProductInput, status: ProductStatus) {
      assertPerm(user, "catalog.edit");
      assertStatusChange(user, null, status, input);
      if (input.initialStock && input.initialStock > 0) assertPerm(user, "inventory.manage", "Su rol no puede registrar existencias iniciales. Deje la cantidad en 0 y solicite a Almacén registrar la entrada.");
      const d = db();
      if (await self.isSkuTaken(input.sku)) throw new DomainError(`El SKU ${input.sku} ya existe`, "conflict");
      let slug = input.slug || slugify(`${input.name}-${input.sku}`);
      while (d.products.some((p) => p.slug === slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
      const t = now();
      const id = uid();
      const brandName = d.brands.find((b) => b.id === input.brandId)?.name ?? null;
      const p: DemoProduct = {
        id, sku: input.sku, slug, name: input.name, categoryId: input.categoryId, subcategoryId: input.subcategoryId,
        brandId: input.brandId, model: input.model, reference: input.reference, altCodes: input.altCodes,
        shortDescription: input.shortDescription, description: input.description, specs: input.specs, price: input.price,
        currency: input.currency, saleMode: input.saleMode, status, featured: input.featured, minStock: input.minStock,
        location: input.location, internalNotes: input.internalNotes,
        cost: can(user.role, "catalog.cost") ? input.cost ?? null : null,
        searchText: "", createdAt: t, updatedAt: t, publishedAt: status === "published" ? t : null,
      };
      p.searchText = buildSearchText(p, brandName);
      d.products.push(p);
      d.inventory[id] = { onHand: 0, reserved: 0, updatedAt: t };
      for (const c of input.compatibilities ?? []) {
        if (c.verified && !can(user.role, "catalog.publish")) throw new DomainError("Solo un revisor técnico puede verificar compatibilidades", "forbidden");
        d.compatibilities.push({ id: uid(), productId: id, brand: c.brand, model: c.model, notes: c.notes, verified: c.verified, verifiedAt: c.verified ? t : null });
      }
      audit(d, user, "insert", "products", id, { sku: p.sku, name: p.name, status });
      if (input.initialStock && input.initialStock > 0) {
        const inv = d.inventory[id];
        inv.onHand = input.initialStock;
        d.movements.unshift({
          id: String(++d.seq.movement), productId: id, type: "entry", onHandDelta: input.initialStock, reservedDelta: 0,
          onHandAfter: inv.onHand, reservedAfter: 0, reason: "Inventario inicial", reference: null,
          actorLabel: user.fullName || user.email, createdAt: t,
        });
      }
      persist();
      return { id };
    },

    async updateProduct(id, input) {
      assertPerm(user, "catalog.edit");
      const d = db();
      const p = d.products.find((x) => x.id === id);
      if (!p) throw new DomainError("Producto no encontrado", "not_found");
      if (await self.isSkuTaken(input.sku, id)) throw new DomainError(`El SKU ${input.sku} ya existe`, "conflict");
      if (p.status === "published") {
        if (!input.categoryId) throw new DomainError("Un producto publicado debe tener categoría");
        if (input.saleMode === "direct" && (input.price == null || input.price <= 0)) {
          throw new DomainError("Los productos de compra directa requieren un precio autorizado");
        }
      }
      const before = { ...p };
      Object.assign(p, {
        sku: input.sku, name: input.name, categoryId: input.categoryId, subcategoryId: input.subcategoryId,
        brandId: input.brandId, model: input.model, reference: input.reference, altCodes: input.altCodes,
        shortDescription: input.shortDescription, description: input.description, specs: input.specs,
        price: input.price, currency: input.currency, saleMode: input.saleMode, featured: input.featured,
        minStock: input.minStock, location: input.location, internalNotes: input.internalNotes,
      });
      if (input.slug) p.slug = input.slug;
      if (can(user.role, "catalog.cost") && input.cost !== undefined) p.cost = input.cost;
      p.searchText = buildSearchText(p, d.brands.find((b) => b.id === p.brandId)?.name ?? null);
      p.updatedAt = now();
      if (input.compatibilities) {
        const existing = d.compatibilities.filter((c) => c.productId === id);
        const next: typeof d.compatibilities = [];
        for (const c of input.compatibilities) {
          const prev = existing.find((e) => e.brand === c.brand && e.model === c.model);
          if (c.verified && !prev?.verified && !can(user.role, "catalog.publish")) {
            throw new DomainError("Solo un revisor técnico puede verificar compatibilidades", "forbidden");
          }
          next.push({
            id: prev?.id ?? uid(), productId: id, brand: c.brand, model: c.model, notes: c.notes, verified: c.verified,
            verifiedAt: c.verified ? prev?.verifiedAt ?? now() : null,
          });
        }
        d.compatibilities = d.compatibilities.filter((c) => c.productId !== id).concat(next);
      }
      const changes = diff(before as unknown as Record<string, unknown>, p as unknown as Record<string, unknown>, ["cost"]);
      if (Object.keys(changes).length) audit(d, user, "update", "products", id, changes);
      persist();
    },

    async setProductStatus(id, status) {
      const d = db();
      const p = d.products.find((x) => x.id === id);
      if (!p) throw new DomainError("Producto no encontrado", "not_found");
      if (p.status === status) return;
      assertStatusChange(user, p.status, status, p);
      const from = p.status;
      p.status = status;
      p.updatedAt = now();
      if (status === "published") p.publishedAt = p.updatedAt;
      audit(d, user, "update", "products", id, { status: { from, to: status } });
      persist();
    },

    async duplicateProduct(id) {
      assertPerm(user, "catalog.edit");
      const src = await self.getProduct(id);
      if (!src) throw new DomainError("Producto no encontrado", "not_found");
      let sku = `${src.sku}-COPIA`.slice(0, 40);
      let n = 2;
      while (await self.isSkuTaken(sku)) sku = `${src.sku}-COPIA${n++}`.slice(0, 40);
      return self.createProduct(
        {
          ...src, sku, slug: undefined, name: `${src.name} (copia)`, featured: false, initialStock: 0,
          cost: src.cost, compatibilities: src.compatibilities.map((c) => ({ brand: c.brand, model: c.model, notes: c.notes, verified: false })),
        },
        "draft",
      );
    },

    async uploadImage(productId, file: UploadFile) {
      assertPerm(user, "catalog.edit");
      const d = db();
      if (!d.products.some((p) => p.id === productId)) throw new DomainError("Producto no encontrado", "not_found");
      const storagePath = `products/${productId}/${uid()}.${extOf(file.name, file.type)}`;
      writeUpload(storagePath, file.bytes);
      const existing = d.images.filter((i) => i.productId === productId);
      const img = {
        id: uid(), productId, storagePath, alt: null, position: existing.length, isPrimary: existing.length === 0,
        width: file.width ?? null, height: file.height ?? null,
      };
      d.images.push(img);
      audit(d, user, "insert", "product_images", img.id, { productId });
      touch(d, productId);
      persist();
      return { ...img, url: demoFileUrl(storagePath) };
    },

    async deleteImage(imageId) {
      assertPerm(user, "catalog.edit");
      const d = db();
      const img = d.images.find((i) => i.id === imageId);
      if (!img) return;
      d.images = d.images.filter((i) => i.id !== imageId);
      removeUpload(img.storagePath);
      const rest = d.images.filter((i) => i.productId === img.productId).sort((a, b) => a.position - b.position);
      rest.forEach((i, idx) => (i.position = idx));
      if (img.isPrimary && rest[0]) rest[0].isPrimary = true;
      audit(d, user, "delete", "product_images", imageId, { productId: img.productId });
      touch(d, img.productId);
      persist();
    },

    async reorderImages(productId, orderedIds) {
      assertPerm(user, "catalog.edit");
      const d = db();
      orderedIds.forEach((id, idx) => {
        const img = d.images.find((i) => i.id === id && i.productId === productId);
        if (img) img.position = idx;
      });
      touch(d, productId);
      persist();
    },

    async setPrimaryImage(productId, imageId) {
      assertPerm(user, "catalog.edit");
      const d = db();
      for (const i of d.images.filter((x) => x.productId === productId)) i.isPrimary = i.id === imageId;
      touch(d, productId);
      persist();
    },

    async updateImageAlt(imageId, alt) {
      assertPerm(user, "catalog.edit");
      const d = db();
      const img = d.images.find((i) => i.id === imageId);
      if (img) img.alt = alt;
      persist();
    },

    async uploadDocument(productId, file, title, isPublic) {
      assertPerm(user, "catalog.edit");
      const d = db();
      if (!d.products.some((p) => p.id === productId)) throw new DomainError("Producto no encontrado", "not_found");
      const storagePath = `products/${productId}/docs/${uid()}.${extOf(file.name, file.type)}`;
      writeUpload(storagePath, file.bytes);
      const doc = {
        id: uid(), productId, title, fileName: file.name, mimeType: file.type, sizeBytes: file.bytes.byteLength, isPublic, storagePath,
      };
      d.documents.push(doc);
      audit(d, user, "insert", "product_documents", doc.id, { productId, title, isPublic });
      persist();
      return doc;
    },

    async updateDocument(documentId, patch) {
      assertPerm(user, "catalog.edit");
      const d = db();
      const doc = d.documents.find((x) => x.id === documentId);
      if (!doc) throw new DomainError("Documento no encontrado", "not_found");
      if (patch.title !== undefined) doc.title = patch.title;
      if (patch.isPublic !== undefined) doc.isPublic = patch.isPublic;
      audit(d, user, "update", "product_documents", documentId, patch);
      persist();
    },

    async deleteDocument(documentId) {
      assertPerm(user, "catalog.edit");
      const d = db();
      const doc = d.documents.find((x) => x.id === documentId);
      if (!doc) return;
      d.documents = d.documents.filter((x) => x.id !== documentId);
      removeUpload(doc.storagePath);
      audit(d, user, "delete", "product_documents", documentId, { title: doc.title });
      persist();
    },

    async getDocumentUrl(documentId) {
      assertPerm(user, "catalog.view");
      const doc = db().documents.find((x) => x.id === documentId);
      return doc ? demoFileUrl(doc.storagePath) : null;
    },

    async listInventory(f) {
      assertPerm(user, "catalog.view");
      const d = db();
      const tokens = searchTokens(f.q);
      let rows: InventoryRow[] = d.products
        .filter((p) => p.status !== "archived")
        .filter((p) => tokens.every((t) => p.searchText.includes(t)))
        .map((p) => {
          const inv = d.inventory[p.id] ?? { onHand: 0, reserved: 0, updatedAt: null };
          return {
            productId: p.id, sku: p.sku, name: p.name, status: p.status, location: p.location,
            onHand: inv.onHand, reserved: inv.reserved, available: inv.onHand - inv.reserved, minStock: p.minStock,
            updatedAt: inv.updatedAt,
          };
        });
      if (f.stock === "out") rows = rows.filter((r) => r.available <= 0);
      if (f.stock === "low") rows = rows.filter((r) => r.available > 0 && r.available <= r.minStock);
      return rows.sort((a, b) => a.sku.localeCompare(b.sku));
    },

    // Misma semántica que public.record_inventory_movement.
    async recordMovement(m) {
      assertPerm(user, "inventory.manage", "No tiene permiso para mover inventario");
      const d = db();
      const inv = d.inventory[m.productId];
      if (!inv) throw new DomainError("Producto sin registro de inventario", "not_found");
      if (m.reason.trim().length < 3) throw new DomainError("Indique el motivo del movimiento");
      if (m.quantity < 0 || (m.type !== "adjustment" && m.quantity === 0)) throw new DomainError("Cantidad inválida");
      const delta = m.type === "entry" ? m.quantity : m.type === "exit" ? -m.quantity : m.quantity - inv.onHand;
      if (inv.onHand + delta < inv.reserved) {
        throw new DomainError(`Existencia insuficiente: ${inv.onHand} unidades físicas, ${inv.reserved} reservadas por pedidos`, "conflict");
      }
      inv.onHand += delta;
      inv.updatedAt = now();
      d.movements.unshift({
        id: String(++d.seq.movement), productId: m.productId, type: m.type, onHandDelta: delta, reservedDelta: 0,
        onHandAfter: inv.onHand, reservedAfter: inv.reserved, reason: m.reason.trim(), reference: m.reference,
        actorLabel: user.fullName || user.email, createdAt: inv.updatedAt,
      });
      persist();
    },

    async listMovements(f) {
      assertPerm(user, "catalog.view");
      const d = db();
      const page = Math.max(1, f.page ?? 1);
      const pageSize = f.pageSize ?? 50;
      let list = d.movements;
      if (f.productId) list = list.filter((m) => m.productId === f.productId);
      if (f.type) list = list.filter((m) => m.type === f.type);
      const items: InventoryMovement[] = list.slice((page - 1) * pageSize, page * pageSize).map((m) => {
        const p = d.products.find((x) => x.id === m.productId);
        return { ...m, sku: p?.sku ?? "—", productName: p?.name ?? "Producto eliminado" };
      });
      return { items, total: list.length, page, pageSize };
    },

    async registerIntake(input) {
      if (!can(user.role, "inventory.manage") && !can(user.role, "catalog.edit")) {
        throw new DomainError("No tiene permiso para registrar ingresos", "forbidden");
      }
      if (input.quantity > 0) assertPerm(user, "inventory.manage", "Su rol no puede registrar existencias");
      const d = db();
      if (await self.isSkuTaken(input.sku)) throw new DomainError(`El SKU ${input.sku} ya existe`, "conflict");
      const t = now();
      const id = uid();
      let slug = slugify(`${input.name}-${input.sku}`);
      while (d.products.some((p) => p.slug === slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
      const p: DemoProduct = {
        id, sku: input.sku, slug, name: input.name, categoryId: input.categoryId, subcategoryId: null, brandId: null,
        model: null, reference: null, altCodes: [], shortDescription: null, description: null, specs: [], price: null,
        currency: "USD", saleMode: "quote", status: "draft", featured: false, minStock: 0, location: input.location,
        internalNotes: null, cost: null, searchText: "", createdAt: t, updatedAt: t, publishedAt: null,
      };
      p.searchText = buildSearchText(p, null);
      d.products.push(p);
      d.inventory[id] = { onHand: input.quantity, reserved: 0, updatedAt: t };
      if (input.quantity > 0) {
        d.movements.unshift({
          id: String(++d.seq.movement), productId: id, type: "entry", onHandDelta: input.quantity, reservedDelta: 0,
          onHandAfter: input.quantity, reservedAfter: 0, reason: input.reason || "Ingreso a almacén", reference: null,
          actorLabel: user.fullName || user.email, createdAt: t,
        });
      }
      audit(d, user, "insert", "products", id, { sku: p.sku, name: p.name, status: "draft", origen: "ingreso de almacén" });
      persist();
      return { id };
    },

    async listOrders(f) {
      assertPerm(user, "orders.view");
      const tokens = searchTokens(f.q);
      let list = db().orders;
      if (f.status === "open") list = list.filter((o) => !["delivered", "cancelled"].includes(o.status));
      else if (f.status && f.status !== "all") list = list.filter((o) => o.status === f.status);
      if (tokens.length) {
        list = list.filter((o) => {
          const hay = `${o.number} ${o.customer.name} ${o.customer.company ?? ""} ${o.customer.email}`.toLowerCase();
          return tokens.every((t) => hay.includes(t));
        });
      }
      return list.map<OrderSummary>((o) => ({
        id: o.id, number: o.number, status: o.status, paymentStatus: o.paymentStatus, customerName: o.customer.name,
        company: o.customer.company ?? null, email: o.customer.email, currency: o.currency, total: o.total,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0), createdAt: o.createdAt,
      }));
    },

    async getOrder(id) {
      assertPerm(user, "orders.view");
      return db().orders.find((o) => o.id === id) ?? null;
    },

    // Misma semántica que public.set_order_status.
    async setOrderStatus(id, status: OrderStatus, note) {
      assertPerm(user, "orders.manage", "No tiene permiso para gestionar pedidos");
      const d = db();
      const o = d.orders.find((x) => x.id === id);
      if (!o) throw new DomainError("Pedido no encontrado", "not_found");
      if (o.status === status) return;
      if (["delivered", "cancelled"].includes(o.status)) throw new DomainError("El pedido ya está cerrado");
      if (status === "cancelled" && o.stockState === "consumed") {
        throw new DomainError("El pedido ya fue despachado; registre una devolución como entrada de inventario");
      }
      const t = now();
      const actor = user.fullName || user.email;
      if ((status === "shipped" || status === "delivered") && o.stockState === "reserved") {
        for (const it of o.items) {
          if (!it.productId || !d.inventory[it.productId]) continue;
          const inv = d.inventory[it.productId];
          inv.onHand -= it.quantity;
          inv.reserved -= it.quantity;
          inv.updatedAt = t;
          d.movements.unshift({
            id: String(++d.seq.movement), productId: it.productId, type: "sale", onHandDelta: -it.quantity, reservedDelta: -it.quantity,
            onHandAfter: inv.onHand, reservedAfter: inv.reserved, reason: "Despacho de pedido", reference: o.number, actorLabel: actor, createdAt: t,
          });
        }
        o.stockState = "consumed";
      } else if (status === "cancelled" && o.stockState === "reserved") {
        for (const it of o.items) {
          if (!it.productId || !d.inventory[it.productId]) continue;
          const inv = d.inventory[it.productId];
          inv.reserved -= it.quantity;
          inv.updatedAt = t;
          d.movements.unshift({
            id: String(++d.seq.movement), productId: it.productId, type: "release", onHandDelta: 0, reservedDelta: -it.quantity,
            onHandAfter: inv.onHand, reservedAfter: inv.reserved, reason: "Liberación por cancelación", reference: o.number, actorLabel: actor, createdAt: t,
          });
        }
        o.stockState = "released";
      }
      o.events.push(event(d, { kind: "status", fromValue: o.status, toValue: status, note, isInternal: false, actorLabel: actor }));
      o.status = status;
      o.updatedAt = t;
      persist();
    },

    async setOrderPayment(id, status: PaymentStatus, note) {
      assertPerm(user, "orders.manage", "No tiene permiso para gestionar pedidos");
      const d = db();
      const o = d.orders.find((x) => x.id === id);
      if (!o) throw new DomainError("Pedido no encontrado", "not_found");
      if (o.paymentStatus === status) return;
      o.events.push(event(d, { kind: "payment", fromValue: o.paymentStatus, toValue: status, note, isInternal: true, actorLabel: user.fullName || user.email }));
      o.paymentStatus = status;
      o.updatedAt = now();
      persist();
    },

    async addOrderNote(id, note) {
      assertPerm(user, "orders.manage", "No tiene permiso para gestionar pedidos");
      const d = db();
      const o = d.orders.find((x) => x.id === id);
      if (!o) throw new DomainError("Pedido no encontrado", "not_found");
      if (!note.trim()) throw new DomainError("La nota está vacía");
      o.events.push(event(d, { kind: "note", fromValue: null, toValue: null, note: note.trim(), isInternal: true, actorLabel: user.fullName || user.email }));
      persist();
    },

    async listQuotes(f) {
      assertPerm(user, "quotes.manage");
      const tokens = searchTokens(f.q);
      let list = db().quotes;
      if (f.status === "open") list = list.filter((q) => ["new", "in_review", "sent"].includes(q.status));
      else if (f.status && f.status !== "all") list = list.filter((q) => q.status === f.status);
      if (tokens.length) {
        list = list.filter((q) => {
          const hay = `${q.number} ${q.customer.name} ${q.customer.company ?? ""} ${q.customer.email}`.toLowerCase();
          return tokens.every((t) => hay.includes(t));
        });
      }
      return list.map<QuoteSummary>((q) => ({
        id: q.id, number: q.number, status: q.status, customerName: q.customer.name, company: q.customer.company ?? null,
        email: q.customer.email, itemCount: q.items.length, createdAt: q.createdAt,
      }));
    },

    async getQuote(id) {
      assertPerm(user, "quotes.manage");
      return db().quotes.find((q) => q.id === id) ?? null;
    },

    async setQuoteStatus(id, status: QuoteStatus, note) {
      assertPerm(user, "quotes.manage", "No tiene permiso para gestionar cotizaciones");
      const d = db();
      const q = d.quotes.find((x) => x.id === id);
      if (!q) throw new DomainError("Solicitud no encontrada", "not_found");
      if (q.status === status) return;
      q.events.push(event(d, { kind: "status", fromValue: q.status, toValue: status, note, isInternal: false, actorLabel: user.fullName || user.email }));
      q.status = status;
      q.updatedAt = now();
      persist();
    },

    async addQuoteNote(id, note) {
      assertPerm(user, "quotes.manage", "No tiene permiso para gestionar cotizaciones");
      const d = db();
      const q = d.quotes.find((x) => x.id === id);
      if (!q) throw new DomainError("Solicitud no encontrada", "not_found");
      if (!note.trim()) throw new DomainError("La nota está vacía");
      q.events.push(event(d, { kind: "note", fromValue: null, toValue: null, note: note.trim(), isInternal: true, actorLabel: user.fullName || user.email }));
      persist();
    },

    async listAllCategories() {
      assertPerm(user, "catalog.view");
      const d = db();
      return d.categories
        .slice()
        .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
        .map((c) => ({ ...c, productCount: d.products.filter((p) => p.categoryId === c.id || p.subcategoryId === c.id).length }));
    },

    async saveCategory(id, input) {
      assertPerm(user, "taxonomy.manage");
      const d = db();
      if (d.categories.some((c) => c.slug === input.slug && c.id !== id)) throw new DomainError("Ya existe una categoría con ese identificador", "conflict");
      if (id && input.parentId === id) throw new DomainError("Una categoría no puede ser su propia categoría superior");
      if (id) {
        const c = d.categories.find((x) => x.id === id);
        if (!c) throw new DomainError("Categoría no encontrada", "not_found");
        audit(d, user, "update", "categories", id, diff(c as unknown as Record<string, unknown>, { ...c, ...input }));
        Object.assign(c, input);
      } else {
        const c: Category = { id: uid(), ...input };
        d.categories.push(c);
        audit(d, user, "insert", "categories", c.id, { name: c.name });
      }
      persist();
    },

    async deleteCategory(id) {
      assertPerm(user, "taxonomy.manage");
      const d = db();
      if (d.products.some((p) => p.categoryId === id || p.subcategoryId === id)) {
        throw new DomainError("La categoría tiene productos asociados. Desactívela o reasigne los productos.", "conflict");
      }
      if (d.categories.some((c) => c.parentId === id)) throw new DomainError("La categoría tiene subcategorías", "conflict");
      d.categories = d.categories.filter((c) => c.id !== id);
      audit(d, user, "delete", "categories", id);
      persist();
    },

    async listAllBrands() {
      assertPerm(user, "catalog.view");
      const d = db();
      return d.brands
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((b) => ({ ...b, productCount: d.products.filter((p) => p.brandId === b.id).length }));
    },

    async saveBrand(id, input) {
      assertPerm(user, "taxonomy.manage");
      const d = db();
      if (d.brands.some((b) => (b.slug === input.slug || b.name.toLowerCase() === input.name.toLowerCase()) && b.id !== id)) {
        throw new DomainError("Ya existe una marca con ese nombre", "conflict");
      }
      if (id) {
        const b = d.brands.find((x) => x.id === id);
        if (!b) throw new DomainError("Marca no encontrada", "not_found");
        Object.assign(b, input);
        for (const p of d.products.filter((x) => x.brandId === id)) p.searchText = buildSearchText(p, b.name);
        audit(d, user, "update", "brands", id, input);
      } else {
        const b = { id: uid(), ...input };
        d.brands.push(b);
        audit(d, user, "insert", "brands", b.id, { name: b.name });
      }
      persist();
    },

    async deleteBrand(id) {
      assertPerm(user, "taxonomy.manage");
      const d = db();
      if (d.products.some((p) => p.brandId === id)) throw new DomainError("La marca tiene productos asociados. Desactívela en su lugar.", "conflict");
      d.brands = d.brands.filter((b) => b.id !== id);
      audit(d, user, "delete", "brands", id);
      persist();
    },

    async exportProducts() {
      assertPerm(user, "data.export");
      const d = db();
      const withCost = can(user.role, "catalog.cost");
      return d.products.map((p) => {
        const inv = d.inventory[p.id] ?? { onHand: 0, reserved: 0 };
        const row: Record<(typeof EXPORT_COLUMNS)[number], string | number | null> = {
          sku: p.sku, name: p.name, status: p.status,
          category: d.categories.find((c) => c.id === p.categoryId)?.name ?? null,
          brand: d.brands.find((b) => b.id === p.brandId)?.name ?? null,
          model: p.model, reference: p.reference, alt_codes: p.altCodes.join("|"), sale_mode: p.saleMode,
          price: p.price, currency: p.currency, cost: withCost ? p.cost : null,
          on_hand: inv.onHand, reserved: inv.reserved, available: inv.onHand - inv.reserved, min_stock: p.minStock,
          location: p.location, updated_at: p.updatedAt,
        };
        return row;
      });
    },

    async importProducts(rows, options) {
      return importProductsWith(self, rows, options);
    },

    async listUsers() {
      assertPerm(user, "users.manage");
      return db().users.map((u) => ({ ...u }));
    },

    async updateUser(id, patch) {
      assertPerm(user, "users.manage");
      const d = db();
      const u = d.users.find((x) => x.id === id);
      if (!u) throw new DomainError("Usuario no encontrado", "not_found");
      if (id === user.id && (patch.active === false || (patch.role && patch.role !== "admin"))) {
        throw new DomainError("No puede desactivar ni quitarse el rol de administrador a sí mismo");
      }
      audit(d, user, "update", "profiles", id, diff(u as unknown as Record<string, unknown>, { ...u, ...patch }));
      Object.assign(u, patch);
      persist();
    },

    async listAudit(f) {
      assertPerm(user, "audit.view");
      const page = Math.max(1, f.page ?? 1);
      const pageSize = f.pageSize ?? 50;
      let list = db().audit;
      if (f.entity) list = list.filter((a) => a.entity === f.entity);
      return { items: list.slice((page - 1) * pageSize, page * pageSize), total: list.length, page, pageSize };
    },
  };
  return self;
}

function touch(d: DemoDB, productId: string) {
  const p = d.products.find((x) => x.id === productId);
  if (p) p.updatedAt = now();
}
