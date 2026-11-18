import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { AdminRepository, ProductListFilter, PublicRepository, UploadFile } from "../repository";
import { DomainError } from "../repository";
import { assertPerm, assertStatusChange, EXPORT_COLUMNS, importProductsWith, searchTokens } from "../shared";
import { publicStorageUrl, supabasePublic } from "../../supabase/server";
import { can } from "../../permissions";
import { slugify } from "../../format";
import type {
  AdminProduct, AdminProductRow, AuditEntry, Brand, CatalogProduct, CatalogProductDetail, CatalogQuery, Category,
  Compatibility, DashboardStats, InventoryMovement, InventoryRow, Order, OrderSummary, ProductDocument, ProductImage,
  ProductInput, ProductStatus, Quote, QuoteSummary, StaffUser, TimelineEvent,
} from "../../types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const IMAGES = "product-images";
const DOCS = "product-documents";

function fail(error: PostgrestError | { message: string; code?: string } | null, fallback = "No se pudo completar la operación"): never {
  const code = (error as PostgrestError | null)?.code;
  const message = error?.message || fallback;
  if (code === "42501") throw new DomainError(message.includes("permission denied") ? "No tiene permiso para realizar esta acción" : message, "forbidden");
  if (code === "23505") throw new DomainError("Ya existe un registro con ese identificador (SKU, slug o nombre)", "conflict");
  if (code === "23503") throw new DomainError("El registro está en uso por otros elementos", "conflict");
  if (code === "P0002") throw new DomainError(message, "not_found");
  if (code === "23514" || code === "22023") throw new DomainError(message, code === "23514" ? "conflict" : "invalid");
  console.error("[ICON supabase]", error);
  throw new DomainError(fallback);
}

function check<T>(res: { data: T; error: PostgrestError | null }, fallback?: string): T {
  if (res.error) fail(res.error, fallback);
  return res.data;
}

// ---------------------------------------------------------------------------
// Mapeos
// ---------------------------------------------------------------------------
function mapCatalog(r: Row): CatalogProduct {
  return {
    id: r.id,
    sku: r.sku,
    slug: r.slug,
    name: r.name,
    categoryId: r.category_id,
    categoryName: r.category_name,
    categorySlug: r.category_slug,
    subcategoryName: r.subcategory_name,
    subcategorySlug: r.subcategory_slug,
    brandId: r.brand_id,
    brandName: r.brand_name,
    brandSlug: r.brand_slug,
    model: r.model,
    reference: r.reference,
    altCodes: r.alt_codes ?? [],
    shortDescription: r.short_description,
    price: r.price == null ? null : Number(r.price),
    currency: r.currency,
    saleMode: r.sale_mode,
    featured: r.featured,
    availability: r.availability,
    imageUrl: r.primary_image_path ? publicStorageUrl(IMAGES, r.primary_image_path) : null,
    publishedAt: r.published_at,
  };
}

function mapImage(r: Row): ProductImage {
  return {
    id: r.id,
    productId: r.product_id,
    storagePath: r.storage_path,
    url: publicStorageUrl(IMAGES, r.storage_path),
    alt: r.alt,
    position: r.position,
    isPrimary: r.is_primary,
    width: r.width,
    height: r.height,
  };
}

function mapDoc(r: Row): ProductDocument {
  return {
    id: r.id, productId: r.product_id, title: r.title, fileName: r.file_name, mimeType: r.mime_type,
    sizeBytes: r.size_bytes == null ? null : Number(r.size_bytes), isPublic: r.is_public ?? true, storagePath: r.storage_path,
  };
}

function mapCompat(r: Row): Compatibility {
  return {
    id: r.id, productId: r.product_id, brand: r.brand, model: r.model, notes: r.notes,
    verified: r.verified ?? true, verifiedAt: r.verified_at,
  };
}

function mapCategory(r: Row): Category {
  return {
    id: r.id, parentId: r.parent_id, name: r.name, slug: r.slug, description: r.description, position: r.position,
    active: r.active ?? true, productCount: r.product_count,
  };
}

function mapEvent(r: Row): TimelineEvent {
  return {
    id: String(r.id), kind: r.kind, fromValue: r.from_value, toValue: r.to_value, note: r.note,
    isInternal: r.is_internal, actorLabel: r.actor_label, createdAt: r.created_at,
  };
}

function customerOf(r: Row) {
  return {
    name: r.customer_name, company: r.company, taxId: r.tax_id, email: r.email, phone: r.phone, city: r.city,
    address: r.address ?? null, notes: r.notes,
  };
}

const CATALOG_COLUMNS =
  "id, sku, slug, name, category_id, category_slug, category_name, subcategory_id, subcategory_slug, subcategory_name, brand_id, brand_slug, brand_name, model, reference, alt_codes, short_description, price, currency, sale_mode, featured, published_at, availability, primary_image_path";

// ---------------------------------------------------------------------------
// Repositorio público (cliente anónimo: solo vistas de catálogo publicadas)
// ---------------------------------------------------------------------------
export function createSupabasePublicRepo(): PublicRepository {
  const sb = supabasePublic() as SupabaseClient;

  return {
    async listCategories() {
      const data = check(await sb.from("catalog_categories").select("*").order("position").order("name"));
      return (data as Row[]).map(mapCategory);
    },

    async listBrands() {
      const data = check(await sb.from("catalog_brands").select("*").order("name"));
      return (data as Row[]).map((r) => ({ id: r.id, name: r.name, slug: r.slug, active: true, productCount: r.product_count }) as Brand);
    },

    async searchCatalog(q: CatalogQuery) {
      const page = Math.max(1, q.page ?? 1);
      const pageSize = Math.min(48, q.pageSize ?? 12);
      let query = sb.from("catalog_products").select(CATALOG_COLUMNS, { count: "exact" });
      for (const t of searchTokens(q.q)) query = query.ilike("search_text", `%${t}%`);
      if (q.category && /^[a-z0-9-]+$/.test(q.category)) {
        query = query.or(`category_slug.eq.${q.category},subcategory_slug.eq.${q.category}`);
      }
      const brands = (q.brand ?? []).filter((b) => /^[a-z0-9-]+$/.test(b));
      if (brands.length) query = query.in("brand_slug", brands);
      if (q.mode) query = query.eq("sale_mode", q.mode);
      if (q.availability === "available") query = query.neq("availability", "out_of_stock");
      if (q.availability === "unavailable") query = query.eq("availability", "out_of_stock");
      if (q.minPrice != null) query = query.gte("price", q.minPrice);
      if (q.maxPrice != null) query = query.lte("price", q.maxPrice);

      switch (q.sort) {
        case "name":
          query = query.order("name");
          break;
        case "price_asc":
          query = query.order("price", { ascending: true, nullsFirst: false });
          break;
        case "price_desc":
          query = query.order("price", { ascending: false, nullsFirst: false });
          break;
        case "newest":
          query = query.order("published_at", { ascending: false });
          break;
        default:
          query = query.order("featured", { ascending: false }).order("name");
      }
      query = query.range((page - 1) * pageSize, page * pageSize - 1);
      const res = await query;
      const rows = check(res) as Row[];
      let items = rows.map(mapCatalog);

      // Relevancia: una coincidencia exacta de SKU, referencia o código alternativo va primero.
      const term = q.q?.trim().toUpperCase();
      if (term && page === 1 && (!q.sort || q.sort === "relevance")) {
        const exact = items.filter((p) => p.sku === term || p.reference?.toUpperCase() === term || p.altCodes.some((c) => c.toUpperCase() === term));
        items = [...exact, ...items.filter((p) => !exact.includes(p))];
      }
      return { items, total: res.count ?? items.length, page, pageSize };
    },

    async listFeatured(limit) {
      const data = check(await sb.from("catalog_products").select(CATALOG_COLUMNS).eq("featured", true).order("published_at", { ascending: false }).limit(limit));
      return (data as Row[]).map(mapCatalog);
    },

    async listNewArrivals(limit) {
      const data = check(await sb.from("catalog_products").select(CATALOG_COLUMNS).order("published_at", { ascending: false }).limit(limit));
      return (data as Row[]).map(mapCatalog);
    },

    async getProductBySlug(slug) {
      if (!/^[a-z0-9-]+$/.test(slug)) return null;
      const res = await sb.from("catalog_products").select(`${CATALOG_COLUMNS}, description, specs`).eq("slug", slug).maybeSingle();
      const row = check(res) as Row | null;
      if (!row) return null;
      const [imgs, docs, compat, related] = await Promise.all([
        sb.from("catalog_product_images").select("*").eq("product_id", row.id).order("is_primary", { ascending: false }).order("position"),
        sb.from("catalog_product_documents").select("id, product_id, title, file_name, mime_type, size_bytes").eq("product_id", row.id),
        sb.from("catalog_compatibilities").select("*").eq("product_id", row.id).order("brand"),
        row.category_id
          ? sb.from("catalog_products").select(CATALOG_COLUMNS).eq("category_id", row.category_id).neq("id", row.id).limit(4)
          : Promise.resolve({ data: [], error: null }),
      ]);
      const detail: CatalogProductDetail = {
        ...mapCatalog(row),
        description: row.description,
        specs: Array.isArray(row.specs) ? row.specs : [],
        images: (check(imgs) as Row[]).map(mapImage),
        documents: (check(docs) as Row[]).map((r) => {
          const { storagePath: _s, isPublic: _i, ...d } = mapDoc(r);
          return d;
        }),
        compatibilities: (check(compat) as Row[]).map((r) => ({ ...mapCompat(r), verified: true })),
        related: ((check(related as any) as Row[]) ?? []).map(mapCatalog),
      };
      return detail;
    },

    async getProductsByIds(ids) {
      if (!ids.length) return [];
      const data = check(await sb.from("catalog_products").select(CATALOG_COLUMNS).in("id", ids));
      return (data as Row[]).map(mapCatalog);
    },

    async listPublishedForSitemap() {
      const data = check(await sb.from("catalog_products").select("slug, published_at").limit(5000));
      return (data as Row[]).map((r) => ({ slug: r.slug, updatedAt: r.published_at }));
    },

    async createOrder(items, customer) {
      const res = await sb.rpc("create_order", {
        p_items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        p_customer: { ...customer, tax_id: customer.taxId },
      });
      const data = check(res, "No se pudo registrar el pedido") as Row;
      return { number: data.number, total: Number(data.total), currency: data.currency };
    },

    async createQuote(items, customer) {
      const res = await sb.rpc("create_quote", {
        p_items: items.map((i) => ({ product_id: i.productId, description: i.description, quantity: i.quantity, notes: i.notes })),
        p_customer: { ...customer, tax_id: customer.taxId },
      });
      const data = check(res, "No se pudo registrar la solicitud") as Row;
      return { number: data.number };
    },

    async track(number, email) {
      const data = check(await sb.rpc("track_request", { p_number: number, p_email: email })) as Row | null;
      if (!data) return null;
      return {
        kind: data.kind, number: data.number, status: data.status, paymentStatus: data.payment_status,
        createdAt: data.created_at, total: data.total == null ? undefined : Number(data.total), currency: data.currency,
        items: data.items ?? [], events: data.events ?? [],
      };
    },

    async getPublicDocumentUrl(documentId) {
      const row = check(await sb.from("catalog_product_documents").select("storage_path").eq("id", documentId).maybeSingle()) as Row | null;
      if (!row) return null;
      const { data, error } = await sb.storage.from(DOCS).createSignedUrl(row.storage_path, 120, { download: true });
      if (error) return null;
      return data.signedUrl;
    },
  };
}

// ---------------------------------------------------------------------------
// Repositorio administrativo (cliente con la sesión del usuario)
// ---------------------------------------------------------------------------
function overviewToRow(r: Row): AdminProductRow {
  return {
    id: r.id, sku: r.sku, name: r.name, status: r.status, saleMode: r.sale_mode,
    price: r.price == null ? null : Number(r.price), currency: r.currency, categoryName: r.category_name,
    brandName: r.brand_name, onHand: r.on_hand, reserved: r.reserved, minStock: r.min_stock,
    imageUrl: r.primary_image_path ? publicStorageUrl(IMAGES, r.primary_image_path) : null,
    imageCount: r.image_count, updatedAt: r.updated_at,
  };
}

function productColumns(input: ProductInput) {
  return {
    sku: input.sku,
    name: input.name,
    category_id: input.categoryId,
    subcategory_id: input.subcategoryId,
    brand_id: input.brandId,
    model: input.model,
    reference: input.reference,
    alt_codes: input.altCodes,
    short_description: input.shortDescription,
    description: input.description,
    specs: input.specs,
    price: input.price,
    currency: input.currency,
    sale_mode: input.saleMode,
    featured: input.featured,
    min_stock: input.minStock,
  };
}

function extOf(name: string, type: string) {
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return type.split("/")[1] ?? "bin";
}

export function createSupabaseAdminRepo(sb: SupabaseClient, user: StaffUser): AdminRepository {
  async function syncCompatibilities(productId: string, list: NonNullable<ProductInput["compatibilities"]>) {
    const existing = (check(await sb.from("product_compatibilities").select("*").eq("product_id", productId)) as Row[]).map(mapCompat);
    const keep = new Set<string>();
    for (const c of list) {
      const prev = existing.find((e) => e.brand === c.brand && e.model === c.model);
      if (prev) {
        keep.add(prev.id);
        if (prev.notes !== c.notes || prev.verified !== c.verified) {
          check(await sb.from("product_compatibilities").update({ notes: c.notes, verified: c.verified }).eq("id", prev.id));
        }
      } else {
        check(await sb.from("product_compatibilities").insert({ product_id: productId, brand: c.brand, model: c.model, notes: c.notes, verified: c.verified }));
      }
    }
    const remove = existing.filter((e) => !keep.has(e.id)).map((e) => e.id);
    if (remove.length) check(await sb.from("product_compatibilities").delete().in("id", remove));
  }

  async function uniqueSlug(base: string, exceptId?: string) {
    let slug = base;
    for (let i = 0; i < 5; i++) {
      let q = sb.from("products").select("id").eq("slug", slug);
      if (exceptId) q = q.neq("id", exceptId);
      const rows = check(await q) as Row[];
      if (!rows.length) return slug;
      slug = `${base}-${Math.random().toString(36).slice(2, 5)}`;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  const self: AdminRepository = {
    user,

    async dashboard(): Promise<DashboardStats> {
      assertPerm(user, "catalog.view");
      const countBy = async (apply: (q: any) => any) => {
        const res = await apply(sb.from("admin_product_overview").select("id", { count: "exact", head: true }));
        if (res.error) fail(res.error);
        return res.count ?? 0;
      };
      const canOrders = can(user.role, "orders.view");
      const canQuotes = can(user.role, "quotes.manage");
      const [published, draft, pendingPhotos, pendingReview, archived, outOfStock, lowStock] = await Promise.all([
        countBy((q) => q.eq("status", "published")),
        countBy((q) => q.eq("status", "draft")),
        countBy((q) => q.eq("status", "pending_photos")),
        countBy((q) => q.eq("status", "pending_review")),
        countBy((q) => q.eq("status", "archived")),
        countBy((q) => q.neq("status", "archived").eq("is_out_of_stock", true)),
        countBy((q) => q.neq("status", "archived").eq("is_low_stock", true)),
      ]);
      let ordersTotal = 0, ordersOpen = 0, quotesPending = 0;
      const sales = new Map<string, { amount: number; count: number }>();
      if (canOrders) {
        const [all, open, paid] = await Promise.all([
          sb.from("orders").select("id", { count: "exact", head: true }),
          sb.from("orders").select("id", { count: "exact", head: true }).not("status", "in", "(delivered,cancelled)"),
          sb.from("orders").select("currency, total").eq("payment_status", "paid").neq("status", "cancelled"),
        ]);
        ordersTotal = all.count ?? 0;
        ordersOpen = open.count ?? 0;
        for (const r of (check(paid) as Row[]) ?? []) {
          const cur = sales.get(r.currency) ?? { amount: 0, count: 0 };
          cur.amount = Math.round((cur.amount + Number(r.total)) * 100) / 100;
          cur.count++;
          sales.set(r.currency, cur);
        }
      }
      if (canQuotes) {
        const res = await sb.from("quote_requests").select("id", { count: "exact", head: true }).in("status", ["new", "in_review"]);
        quotesPending = res.count ?? 0;
      }
      const attention = check(
        await sb.from("admin_product_overview").select("*").in("status", ["pending_review", "pending_photos"]).order("updated_at", { ascending: false }).limit(6),
      ) as Row[];
      return {
        published, draft, pendingPhotos, pendingReview, archived, outOfStock, lowStock, ordersTotal, ordersOpen, quotesPending,
        confirmedSales: [...sales].map(([currency, v]) => ({ currency, ...v })),
        recentOrders: canOrders ? (await self.listOrders({ status: "all" })).slice(0, 5) : [],
        recentQuotes: canQuotes ? (await self.listQuotes({ status: "all" })).slice(0, 5) : [],
        attention: attention.map(overviewToRow),
      };
    },

    async listProducts(f: ProductListFilter) {
      assertPerm(user, "catalog.view");
      const page = Math.max(1, f.page ?? 1);
      const pageSize = Math.min(f.pageSize ?? 25, 1000);
      let q = sb.from("admin_product_overview").select("*", { count: "exact" });
      if (f.status && f.status !== "all") q = q.eq("status", f.status);
      else if (!f.status) q = q.neq("status", "archived");
      for (const t of searchTokens(f.q)) q = q.ilike("search_text", `%${t}%`);
      if (f.categoryId) q = q.eq("category_id", f.categoryId);
      if (f.saleMode) q = q.eq("sale_mode", f.saleMode);
      if (f.stock === "out") q = q.eq("is_out_of_stock", true);
      if (f.stock === "low") q = q.eq("is_low_stock", true);
      const res = await q.order("updated_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
      const rows = check(res) as Row[];
      return { items: rows.map(overviewToRow), total: res.count ?? rows.length, page, pageSize };
    },

    async getProduct(id) {
      assertPerm(user, "catalog.view");
      const p = check(await sb.from("products").select("*").eq("id", id).maybeSingle()) as Row | null;
      if (!p) return null;
      const withCost = can(user.role, "catalog.cost");
      const [internal, cost, level, imgs, docs, compat] = await Promise.all([
        sb.from("product_internal").select("*").eq("product_id", id).maybeSingle(),
        withCost ? sb.from("product_costs").select("cost").eq("product_id", id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        sb.from("inventory_levels").select("*").eq("product_id", id).maybeSingle(),
        sb.from("product_images").select("*").eq("product_id", id).order("is_primary", { ascending: false }).order("position"),
        sb.from("product_documents").select("*").eq("product_id", id).order("created_at"),
        sb.from("product_compatibilities").select("*").eq("product_id", id).order("brand"),
      ]);
      const inv = (check(level) as Row | null) ?? { on_hand: 0, reserved: 0 };
      const internalRow = (check(internal) as Row | null) ?? {};
      const costRow = check(cost as any) as Row | null;
      const result: AdminProduct = {
        id: p.id, sku: p.sku, slug: p.slug, name: p.name, categoryId: p.category_id, subcategoryId: p.subcategory_id,
        brandId: p.brand_id, model: p.model, reference: p.reference, altCodes: p.alt_codes ?? [],
        shortDescription: p.short_description, description: p.description, specs: p.specs ?? [],
        price: p.price == null ? null : Number(p.price), currency: p.currency, saleMode: p.sale_mode, status: p.status,
        featured: p.featured, minStock: p.min_stock, location: internalRow.location ?? null,
        internalNotes: internalRow.internal_notes ?? null,
        cost: costRow?.cost == null ? null : Number(costRow.cost),
        onHand: inv.on_hand, reserved: inv.reserved,
        images: (check(imgs) as Row[]).map(mapImage),
        documents: (check(docs) as Row[]).map(mapDoc),
        compatibilities: (check(compat) as Row[]).map(mapCompat),
        createdAt: p.created_at, updatedAt: p.updated_at, publishedAt: p.published_at,
      };
      return result;
    },

    async isSkuTaken(sku, exceptId) {
      let q = sb.from("products").select("id").eq("sku", sku);
      if (exceptId) q = q.neq("id", exceptId);
      return (check(await q) as Row[]).length > 0;
    },

    async createProduct(input, status: ProductStatus) {
      assertPerm(user, "catalog.edit");
      assertStatusChange(user, null, status, input);
      if (input.initialStock && input.initialStock > 0) assertPerm(user, "inventory.manage", "Su rol no puede registrar existencias iniciales. Deje la cantidad en 0 y solicite a Almacén registrar la entrada.");
      if (await self.isSkuTaken(input.sku)) throw new DomainError(`El SKU ${input.sku} ya existe`, "conflict");
      const slug = await uniqueSlug(input.slug || slugify(`${input.name}-${input.sku}`));
      const created = check(await sb.from("products").insert({ ...productColumns(input), slug, status }).select("id").single()) as Row;
      const id = created.id as string;
      check(await sb.from("product_internal").update({ location: input.location, internal_notes: input.internalNotes }).eq("product_id", id));
      if (can(user.role, "catalog.cost") && input.cost != null) {
        check(await sb.from("product_costs").update({ cost: input.cost }).eq("product_id", id));
      }
      if (input.compatibilities?.length) await syncCompatibilities(id, input.compatibilities);
      if (input.initialStock && input.initialStock > 0) {
        check(await sb.rpc("record_inventory_movement", { p_product_id: id, p_type: "entry", p_quantity: input.initialStock, p_reason: "Inventario inicial" }));
      }
      return { id };
    },

    async updateProduct(id, input) {
      assertPerm(user, "catalog.edit");
      if (await self.isSkuTaken(input.sku, id)) throw new DomainError(`El SKU ${input.sku} ya existe`, "conflict");
      const patch: Row = productColumns(input);
      if (input.slug) patch.slug = await uniqueSlug(input.slug, id);
      check(await sb.from("products").update(patch).eq("id", id));
      check(await sb.from("product_internal").update({ location: input.location, internal_notes: input.internalNotes, updated_at: new Date().toISOString() }).eq("product_id", id));
      if (can(user.role, "catalog.cost") && input.cost !== undefined) {
        check(await sb.from("product_costs").update({ cost: input.cost, updated_at: new Date().toISOString() }).eq("product_id", id));
      }
      if (input.compatibilities) await syncCompatibilities(id, input.compatibilities);
    },

    async setProductStatus(id, status) {
      const p = check(await sb.from("products").select("status, category_id, sale_mode, price").eq("id", id).maybeSingle()) as Row | null;
      if (!p) throw new DomainError("Producto no encontrado", "not_found");
      if (p.status === status) return;
      assertStatusChange(user, p.status, status, { categoryId: p.category_id, saleMode: p.sale_mode, price: p.price == null ? null : Number(p.price) });
      check(await sb.from("products").update({ status }).eq("id", id));
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
          compatibilities: src.compatibilities.map((c) => ({ brand: c.brand, model: c.model, notes: c.notes, verified: false })),
        },
        "draft",
      );
    },

    async uploadImage(productId, file: UploadFile) {
      assertPerm(user, "catalog.edit");
      const storagePath = `products/${productId}/${randomUUID()}.${extOf(file.name, file.type)}`;
      const up = await sb.storage.from(IMAGES).upload(storagePath, file.bytes, { contentType: file.type, upsert: false, cacheControl: "31536000" });
      if (up.error) fail({ message: up.error.message }, "No se pudo subir la fotografía");
      const count = check(await sb.from("product_images").select("id").eq("product_id", productId)) as Row[];
      const row = check(
        await sb.from("product_images").insert({
          product_id: productId, storage_path: storagePath, position: count.length, is_primary: count.length === 0,
          width: file.width ?? null, height: file.height ?? null,
        }).select("*").single(),
      ) as Row;
      await sb.from("products").update({ updated_at: new Date().toISOString() }).eq("id", productId);
      return mapImage(row);
    },

    async deleteImage(imageId) {
      assertPerm(user, "catalog.edit");
      const img = check(await sb.from("product_images").select("*").eq("id", imageId).maybeSingle()) as Row | null;
      if (!img) return;
      check(await sb.from("product_images").delete().eq("id", imageId));
      await sb.storage.from(IMAGES).remove([img.storage_path]);
      const rest = check(await sb.from("product_images").select("id, is_primary").eq("product_id", img.product_id).order("position")) as Row[];
      for (let i = 0; i < rest.length; i++) {
        check(await sb.from("product_images").update({ position: i }).eq("id", rest[i].id));
      }
      if (img.is_primary && rest[0]) check(await sb.from("product_images").update({ is_primary: true }).eq("id", rest[0].id));
    },

    async reorderImages(productId, orderedIds) {
      assertPerm(user, "catalog.edit");
      for (let i = 0; i < orderedIds.length; i++) {
        check(await sb.from("product_images").update({ position: i }).eq("id", orderedIds[i]).eq("product_id", productId));
      }
    },

    async setPrimaryImage(productId, imageId) {
      assertPerm(user, "catalog.edit");
      check(await sb.from("product_images").update({ is_primary: false }).eq("product_id", productId).eq("is_primary", true));
      check(await sb.from("product_images").update({ is_primary: true }).eq("id", imageId).eq("product_id", productId));
    },

    async updateImageAlt(imageId, alt) {
      assertPerm(user, "catalog.edit");
      check(await sb.from("product_images").update({ alt }).eq("id", imageId));
    },

    async uploadDocument(productId, file, title, isPublic) {
      assertPerm(user, "catalog.edit");
      const storagePath = `products/${productId}/${randomUUID()}.${extOf(file.name, file.type)}`;
      const up = await sb.storage.from(DOCS).upload(storagePath, file.bytes, { contentType: file.type, upsert: false });
      if (up.error) fail({ message: up.error.message }, "No se pudo subir el documento");
      const row = check(
        await sb.from("product_documents").insert({
          product_id: productId, title, storage_path: storagePath, file_name: file.name, mime_type: file.type,
          size_bytes: file.bytes.byteLength, is_public: isPublic,
        }).select("*").single(),
      ) as Row;
      return mapDoc(row);
    },

    async updateDocument(documentId, patch) {
      assertPerm(user, "catalog.edit");
      const row: Row = {};
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.isPublic !== undefined) row.is_public = patch.isPublic;
      check(await sb.from("product_documents").update(row).eq("id", documentId));
    },

    async deleteDocument(documentId) {
      assertPerm(user, "catalog.edit");
      const doc = check(await sb.from("product_documents").select("storage_path").eq("id", documentId).maybeSingle()) as Row | null;
      if (!doc) return;
      check(await sb.from("product_documents").delete().eq("id", documentId));
      await sb.storage.from(DOCS).remove([doc.storage_path]);
    },

    async getDocumentUrl(documentId) {
      assertPerm(user, "catalog.view");
      const doc = check(await sb.from("product_documents").select("storage_path").eq("id", documentId).maybeSingle()) as Row | null;
      if (!doc) return null;
      const { data, error } = await sb.storage.from(DOCS).createSignedUrl(doc.storage_path, 120);
      return error ? null : data.signedUrl;
    },

    async listInventory(f) {
      assertPerm(user, "catalog.view");
      let q = sb.from("admin_product_overview").select("id, sku, name, status, location, on_hand, reserved, available, min_stock, stock_updated_at").neq("status", "archived");
      for (const t of searchTokens(f.q)) q = q.ilike("search_text", `%${t}%`);
      if (f.stock === "out") q = q.eq("is_out_of_stock", true);
      if (f.stock === "low") q = q.eq("is_low_stock", true);
      const rows = check(await q.order("sku").limit(2000)) as Row[];
      return rows.map<InventoryRow>((r) => ({
        productId: r.id, sku: r.sku, name: r.name, status: r.status, location: r.location, onHand: r.on_hand,
        reserved: r.reserved, available: r.available, minStock: r.min_stock, updatedAt: r.stock_updated_at,
      }));
    },

    async recordMovement(m) {
      assertPerm(user, "inventory.manage", "No tiene permiso para mover inventario");
      check(await sb.rpc("record_inventory_movement", {
        p_product_id: m.productId, p_type: m.type, p_quantity: m.quantity, p_reason: m.reason, p_reference: m.reference,
      }));
    },

    async listMovements(f) {
      assertPerm(user, "catalog.view");
      const page = Math.max(1, f.page ?? 1);
      const pageSize = f.pageSize ?? 50;
      let q = sb.from("inventory_movements").select("*, product:products(sku, name)", { count: "exact" });
      if (f.productId) q = q.eq("product_id", f.productId);
      if (f.type) q = q.eq("type", f.type);
      const res = await q.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
      const rows = check(res) as Row[];
      return {
        items: rows.map<InventoryMovement>((r) => ({
          id: String(r.id), productId: r.product_id, sku: r.product?.sku ?? "—", productName: r.product?.name ?? "—",
          type: r.type, onHandDelta: r.on_hand_delta, reservedDelta: r.reserved_delta, onHandAfter: r.on_hand_after,
          reservedAfter: r.reserved_after, reason: r.reason, reference: r.reference, actorLabel: r.actor_label, createdAt: r.created_at,
        })),
        total: res.count ?? rows.length, page, pageSize,
      };
    },

    async registerIntake(input) {
      if (await self.isSkuTaken(input.sku)) throw new DomainError(`El SKU ${input.sku} ya existe`, "conflict");
      const slug = await uniqueSlug(slugify(`${input.name}-${input.sku}`));
      const id = check(await sb.rpc("register_intake", {
        p_sku: input.sku, p_name: input.name, p_quantity: input.quantity, p_location: input.location,
        p_reason: input.reason, p_category_id: input.categoryId, p_slug: slug,
      })) as string;
      return { id };
    },

    async listOrders(f) {
      assertPerm(user, "orders.view");
      let q = sb.from("orders").select("id, number, status, payment_status, customer_name, company, email, currency, total, created_at, order_items(quantity)");
      if (f.status === "open") q = q.not("status", "in", "(delivered,cancelled)");
      else if (f.status && f.status !== "all") q = q.eq("status", f.status);
      const term = f.q?.trim().replace(/[^\p{L}\p{N}@.\- ]/gu, "");
      if (term) q = q.or(`number.ilike.%${term}%,customer_name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%`);
      const rows = check(await q.order("created_at", { ascending: false }).limit(300)) as Row[];
      return rows.map<OrderSummary>((r) => ({
        id: r.id, number: r.number, status: r.status, paymentStatus: r.payment_status, customerName: r.customer_name,
        company: r.company, email: r.email, currency: r.currency, total: Number(r.total),
        itemCount: (r.order_items ?? []).reduce((s: number, i: Row) => s + i.quantity, 0), createdAt: r.created_at,
      }));
    },

    async getOrder(id) {
      assertPerm(user, "orders.view");
      const r = check(await sb.from("orders").select("*, order_items(*), order_events(*)").eq("id", id).maybeSingle()) as Row | null;
      if (!r) return null;
      const order: Order = {
        id: r.id, number: r.number, status: r.status, paymentStatus: r.payment_status, stockState: r.stock_state,
        customer: customerOf(r), currency: r.currency, subtotal: Number(r.subtotal), total: Number(r.total),
        items: (r.order_items as Row[]).map((i) => ({
          productId: i.product_id, sku: i.sku, name: i.name, unitPrice: Number(i.unit_price), quantity: i.quantity, lineTotal: Number(i.line_total),
        })),
        events: (r.order_events as Row[]).map(mapEvent).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        createdAt: r.created_at, updatedAt: r.updated_at,
      };
      return order;
    },

    async setOrderStatus(id, status, note) {
      assertPerm(user, "orders.manage", "No tiene permiso para gestionar pedidos");
      check(await sb.rpc("set_order_status", { p_order_id: id, p_status: status, p_note: note }));
    },

    async setOrderPayment(id, status, note) {
      assertPerm(user, "orders.manage", "No tiene permiso para gestionar pedidos");
      check(await sb.rpc("set_order_payment", { p_order_id: id, p_status: status, p_note: note }));
    },

    async addOrderNote(id, note) {
      assertPerm(user, "orders.manage", "No tiene permiso para gestionar pedidos");
      check(await sb.rpc("add_order_note", { p_order_id: id, p_note: note }));
    },

    async listQuotes(f) {
      assertPerm(user, "quotes.manage");
      let q = sb.from("quote_requests").select("id, number, status, customer_name, company, email, created_at, quote_items(id)");
      if (f.status === "open") q = q.in("status", ["new", "in_review", "sent"]);
      else if (f.status && f.status !== "all") q = q.eq("status", f.status);
      const term = f.q?.trim().replace(/[^\p{L}\p{N}@.\- ]/gu, "");
      if (term) q = q.or(`number.ilike.%${term}%,customer_name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%`);
      const rows = check(await q.order("created_at", { ascending: false }).limit(300)) as Row[];
      return rows.map<QuoteSummary>((r) => ({
        id: r.id, number: r.number, status: r.status, customerName: r.customer_name, company: r.company, email: r.email,
        itemCount: (r.quote_items ?? []).length, createdAt: r.created_at,
      }));
    },

    async getQuote(id) {
      assertPerm(user, "quotes.manage");
      const r = check(await sb.from("quote_requests").select("*, quote_items(*), quote_events(*)").eq("id", id).maybeSingle()) as Row | null;
      if (!r) return null;
      const quote: Quote = {
        id: r.id, number: r.number, status: r.status, customer: customerOf(r),
        items: (r.quote_items as Row[]).map((i) => ({ productId: i.product_id, sku: i.sku, name: i.name, quantity: i.quantity, notes: i.notes })),
        events: (r.quote_events as Row[]).map(mapEvent).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        createdAt: r.created_at, updatedAt: r.updated_at,
      };
      return quote;
    },

    async setQuoteStatus(id, status, note) {
      assertPerm(user, "quotes.manage", "No tiene permiso para gestionar cotizaciones");
      check(await sb.rpc("set_quote_status", { p_quote_id: id, p_status: status, p_note: note }));
    },

    async addQuoteNote(id, note) {
      assertPerm(user, "quotes.manage", "No tiene permiso para gestionar cotizaciones");
      check(await sb.rpc("add_quote_note", { p_quote_id: id, p_note: note }));
    },

    async listAllCategories() {
      assertPerm(user, "catalog.view");
      const [cats, counts] = await Promise.all([
        sb.from("categories").select("*").order("position").order("name"),
        sb.from("products").select("category_id, subcategory_id"),
      ]);
      const countRows = check(counts) as Row[];
      return (check(cats) as Row[]).map((r) => ({
        ...mapCategory(r),
        productCount: countRows.filter((p) => p.category_id === r.id || p.subcategory_id === r.id).length,
      }));
    },

    async saveCategory(id, input) {
      assertPerm(user, "taxonomy.manage");
      const row = { name: input.name, slug: input.slug, parent_id: input.parentId, description: input.description, position: input.position, active: input.active };
      if (id) check(await sb.from("categories").update(row).eq("id", id));
      else check(await sb.from("categories").insert(row));
    },

    async deleteCategory(id) {
      assertPerm(user, "taxonomy.manage");
      const used = check(await sb.from("products").select("id").or(`category_id.eq.${id},subcategory_id.eq.${id}`).limit(1)) as Row[];
      if (used.length) throw new DomainError("La categoría tiene productos asociados. Desactívela o reasigne los productos.", "conflict");
      check(await sb.from("categories").delete().eq("id", id));
    },

    async listAllBrands() {
      assertPerm(user, "catalog.view");
      const [brands, counts] = await Promise.all([sb.from("brands").select("*").order("name"), sb.from("products").select("brand_id")]);
      const countRows = check(counts) as Row[];
      return (check(brands) as Row[]).map((r) => ({
        id: r.id, name: r.name, slug: r.slug, active: r.active, productCount: countRows.filter((p) => p.brand_id === r.id).length,
      }));
    },

    async saveBrand(id, input) {
      assertPerm(user, "taxonomy.manage");
      if (id) check(await sb.from("brands").update(input).eq("id", id));
      else check(await sb.from("brands").insert(input));
    },

    async deleteBrand(id) {
      assertPerm(user, "taxonomy.manage");
      const used = check(await sb.from("products").select("id").eq("brand_id", id).limit(1)) as Row[];
      if (used.length) throw new DomainError("La marca tiene productos asociados. Desactívela en su lugar.", "conflict");
      check(await sb.from("brands").delete().eq("id", id));
    },

    async exportProducts() {
      assertPerm(user, "data.export");
      const withCost = can(user.role, "catalog.cost");
      const [rows, prods, costs] = await Promise.all([
        sb.from("admin_product_overview").select("*").order("sku").limit(10000),
        sb.from("products").select("id, model, reference, alt_codes").limit(10000),
        withCost ? sb.from("product_costs").select("product_id, cost").limit(10000) : Promise.resolve({ data: [], error: null }),
      ]);
      const extra = new Map((check(prods) as Row[]).map((p) => [p.id, p]));
      const costMap = new Map(((check(costs as any) as Row[]) ?? []).map((c) => [c.product_id, c.cost]));
      return (check(rows) as Row[]).map((r) => {
        const e = extra.get(r.id) ?? {};
        const out: Record<(typeof EXPORT_COLUMNS)[number], string | number | null> = {
          sku: r.sku, name: r.name, status: r.status, category: r.category_name, brand: r.brand_name,
          model: e.model ?? null, reference: e.reference ?? null, alt_codes: (e.alt_codes ?? []).join("|"),
          sale_mode: r.sale_mode, price: r.price == null ? null : Number(r.price), currency: r.currency,
          cost: withCost ? (costMap.get(r.id) == null ? null : Number(costMap.get(r.id))) : null,
          on_hand: r.on_hand, reserved: r.reserved, available: r.available, min_stock: r.min_stock,
          location: r.location, updated_at: r.updated_at,
        };
        return out;
      });
    },

    async importProducts(rows, options) {
      return importProductsWith(self, rows, options);
    },

    async listUsers() {
      assertPerm(user, "users.manage");
      const rows = check(await sb.from("profiles").select("*").order("created_at")) as Row[];
      return rows.map<StaffUser>((r) => ({ id: r.id, email: r.email, fullName: r.full_name ?? "", role: r.role, active: r.active, createdAt: r.created_at }));
    },

    async updateUser(id, patch) {
      assertPerm(user, "users.manage");
      if (id === user.id && (patch.active === false || (patch.role && patch.role !== "admin"))) {
        throw new DomainError("No puede desactivar ni quitarse el rol de administrador a sí mismo");
      }
      const row: Row = {};
      if (patch.role) row.role = patch.role;
      if (patch.active !== undefined) row.active = patch.active;
      if (patch.fullName !== undefined) row.full_name = patch.fullName;
      check(await sb.from("profiles").update(row).eq("id", id));
    },

    async listAudit(f) {
      assertPerm(user, "audit.view");
      const page = Math.max(1, f.page ?? 1);
      const pageSize = f.pageSize ?? 50;
      let q = sb.from("audit_log").select("*", { count: "exact" });
      if (f.entity) q = q.eq("entity", f.entity);
      const res = await q.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
      const rows = check(res) as Row[];
      return {
        items: rows.map<AuditEntry>((r) => ({
          id: String(r.id), actorLabel: r.actor_label, action: r.action, entity: r.entity, entityId: r.entity_id,
          details: r.details ?? {}, createdAt: r.created_at,
        })),
        total: res.count ?? rows.length, page, pageSize,
      };
    },
  };
  return self;
}
