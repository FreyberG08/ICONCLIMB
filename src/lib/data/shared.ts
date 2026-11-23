import { can } from "../permissions";
import { normalizeSearch, normalizeSku, slugify } from "../format";
import type { AdminRepository } from "./repository";
import { DomainError } from "./repository";
import type {
  SalesRankRow, SalesRanking,
  AdminProduct, CatalogProductDetail, ImportReport, ImportRow, Permission, ProductInput, ProductStatus, StaffUser,
} from "../types";
import { CURRENCIES } from "../config";

export function assertPerm(user: StaffUser, perm: Permission, message?: string) {
  if (!user.active || !can(user.role, perm)) {
    throw new DomainError(message ?? "No tiene permiso para realizar esta acción", "forbidden");
  }
}

/** Reglas de transición de estado, idénticas al trigger products_guard de la base de datos. */
export function assertStatusChange(user: StaffUser, from: ProductStatus | null, to: ProductStatus, p: { categoryId: string | null; saleMode: string; price: number | null }) {
  const touchesPublished = to === "published" || from === "published";
  if (touchesPublished && !can(user.role, "catalog.publish")) {
    throw new DomainError(
      from === null ? "Un producto nuevo no puede publicarse sin revisión" : "Solo un revisor o administrador puede publicar o despublicar productos",
      "forbidden",
    );
  }
  if (!touchesPublished && !can(user.role, "catalog.edit") && !can(user.role, "catalog.publish")) {
    throw new DomainError("No tiene permiso para cambiar el estado", "forbidden");
  }
  if (to === "published") {
    if (!p.categoryId) throw new DomainError("Asigne una categoría antes de publicar");
    if (p.saleMode === "direct" && (p.price == null || p.price <= 0)) {
      throw new DomainError("Los productos de compra directa requieren un precio autorizado");
    }
  }
}

/** Tokeniza una búsqueda: minúsculas, sin acentos, sin caracteres de control de filtros. */
export function searchTokens(q: string | undefined) {
  if (!q) return [];
  return normalizeSearch(q)
    .replace(/[^a-z0-9.\-/ ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .slice(0, 8);
}

/** Puntuación de relevancia: coincidencias exactas de SKU/referencia/código primero. */
export function relevanceScore(tokens: string[], p: { sku: string; reference: string | null; altCodes: string[]; name: string; searchText: string }) {
  if (tokens.length === 0) return 0;
  const full = tokens.join(" ");
  const sku = p.sku.toLowerCase();
  const ref = (p.reference ?? "").toLowerCase();
  const codes = p.altCodes.map((c) => c.toLowerCase());
  let score = 0;
  if (sku === full) score += 1000;
  else if (sku.startsWith(full)) score += 400;
  if (ref && ref === full) score += 800;
  if (codes.includes(full)) score += 700;
  const name = normalizeSearch(p.name);
  for (const t of tokens) {
    if (name.startsWith(t)) score += 30;
    else if (name.includes(t)) score += 15;
    if (p.searchText.includes(t)) score += 5;
  }
  return score;
}

export function buildSearchText(p: { sku: string; name: string; model: string | null; reference: string | null; altCodes: string[] }, brandName: string | null) {
  return normalizeSearch([p.sku, p.name, p.model, p.reference, p.altCodes.join(" "), brandName].filter(Boolean).join(" "));
}

/** Vista previa del administrador: convierte un producto interno en ficha pública. */
export function adminToPreview(p: AdminProduct, names: { category: string | null; categorySlug: string | null; brand: string | null }): CatalogProductDetail {
  const available = p.onHand - p.reserved;
  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    categoryId: p.categoryId,
    categoryName: names.category,
    categorySlug: names.categorySlug,
    subcategoryName: null,
    subcategorySlug: null,
    brandId: p.brandId,
    brandName: names.brand,
    brandSlug: null,
    model: p.model,
    reference: p.reference,
    altCodes: p.altCodes,
    shortDescription: p.shortDescription,
    description: p.description,
    specs: p.specs,
    price: p.saleMode === "direct" ? p.price : null,
    currency: p.currency,
    saleMode: p.saleMode,
    featured: p.featured,
    availability: available <= 0 ? "out_of_stock" : available <= p.minStock ? "low_stock" : "in_stock",
    imageUrl: [...p.images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position)[0]?.url ?? null,
    publishedAt: p.publishedAt,
    images: [...p.images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position),
    documents: p.documents.filter((d) => d.isPublic).map(({ storagePath: _s, isPublic: _i, ...d }) => d),
    compatibilities: p.compatibilities.filter((c) => c.verified),
    related: [],
  };
}

/** Lista de verificación previa a la publicación (informativa para el revisor). */
export function publishChecklist(p: AdminProduct) {
  return [
    { label: "Categoría asignada", ok: !!p.categoryId, required: true },
    { label: p.saleMode === "direct" ? "Precio autorizado" : "Modalidad: cotización (sin precio público)", ok: p.saleMode === "quote" || (p.price ?? 0) > 0, required: true },
    { label: "Al menos una fotografía", ok: p.images.length > 0, required: false },
    { label: "Descripción corta", ok: !!p.shortDescription, required: false },
    { label: "Características técnicas", ok: p.specs.length > 0, required: false },
    { label: "Marca asignada", ok: !!p.brandId, required: false },
    { label: "Existencia registrada", ok: p.onHand > 0 || p.saleMode === "quote", required: false },
  ];
}

const CSV_SALE_MODES: Record<string, "direct" | "quote"> = {
  direct: "direct", directa: "direct", compra: "direct", "compra directa": "direct",
  quote: "quote", cotizacion: "quote", "cotización": "quote",
};

function parseNumber(v: string | undefined) {
  if (v == null || v.trim() === "") return null;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/** Importación CSV común a ambos proveedores. Nunca publica: los productos nuevos quedan en borrador. */
export async function importProductsWith(repo: AdminRepository, rows: ImportRow[], options: { updateExisting: boolean }): Promise<ImportReport> {
  assertPerm(repo.user, "data.import");
  const report: ImportReport = { created: 0, updated: 0, skipped: 0, errors: [] };
  if (rows.length > 2000) throw new DomainError("El archivo supera el máximo de 2000 filas por importación");
  const categories = await repo.listAllCategories();
  let brands = await repo.listAllBrands();
  const seen = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 2; // +1 encabezado, +1 base 1
    const sku = normalizeSku(row.sku ?? "");
    try {
      if (!sku) throw new DomainError("SKU vacío");
      if (seen.has(sku)) throw new DomainError("SKU repetido en el archivo");
      seen.add(sku);
      if (!row.name?.trim()) throw new DomainError("Nombre vacío");

      let categoryId: string | null = null;
      if (row.category?.trim()) {
        const key = normalizeSearch(row.category);
        const cat = categories.find((c) => c.slug === slugify(row.category!) || normalizeSearch(c.name) === key);
        if (!cat) throw new DomainError(`Categoría no encontrada: "${row.category}"`);
        categoryId = cat.id;
      }

      let brandId: string | null = null;
      if (row.brand?.trim()) {
        const key = normalizeSearch(row.brand);
        let brand = brands.find((b) => normalizeSearch(b.name) === key);
        if (!brand) {
          assertPerm(repo.user, "taxonomy.manage", "No tiene permiso para crear marcas nuevas desde la importación");
          await repo.saveBrand(null, { name: row.brand.trim(), slug: slugify(row.brand), active: true });
          brands = await repo.listAllBrands();
          brand = brands.find((b) => normalizeSearch(b.name) === key);
        }
        brandId = brand?.id ?? null;
      }

      const price = parseNumber(row.price);
      if (Number.isNaN(price)) throw new DomainError("Precio inválido");
      const minStock = parseNumber(row.min_stock);
      if (Number.isNaN(minStock)) throw new DomainError("Stock mínimo inválido");
      const initialStock = parseNumber(row.initial_stock);
      if (Number.isNaN(initialStock) || (initialStock != null && (initialStock < 0 || !Number.isInteger(initialStock)))) {
        throw new DomainError("Existencia inicial inválida");
      }
      const currency = (row.currency?.trim().toUpperCase() || "USD") as ProductInput["currency"];
      if (!(CURRENCIES as readonly string[]).includes(currency)) throw new DomainError(`Moneda no admitida: ${currency}`);
      const modeKey = normalizeSearch(row.sale_mode ?? "");
      const saleMode = modeKey ? CSV_SALE_MODES[modeKey] : price && price > 0 ? "direct" : "quote";
      if (!saleMode) throw new DomainError(`Modalidad inválida: "${row.sale_mode}" (use directa o cotizacion)`);

      const input: ProductInput = {
        sku,
        name: row.name.trim(),
        categoryId,
        subcategoryId: null,
        brandId,
        model: row.model?.trim() || null,
        reference: row.reference?.trim() || null,
        altCodes: (row.alt_codes ?? "").split(/[|;]/).map((s) => s.trim()).filter(Boolean),
        shortDescription: row.short_description?.trim().slice(0, 280) || null,
        description: row.description?.trim() || null,
        specs: [],
        price,
        currency,
        saleMode,
        featured: false,
        minStock: minStock ?? 0,
        location: row.location?.trim() || null,
        internalNotes: null,
      };

      const existing = await repo.listProducts({ q: sku, status: "all", pageSize: 5 });
      const match = existing.items.find((p) => p.sku === sku);
      if (match) {
        if (!options.updateExisting) {
          report.skipped++;
          continue;
        }
        const current = await repo.getProduct(match.id);
        if (!current) throw new DomainError("No se pudo leer el producto existente");
        await repo.updateProduct(match.id, {
          ...input,
          specs: current.specs,
          featured: current.featured,
          subcategoryId: current.subcategoryId,
          description: input.description ?? current.description,
          internalNotes: current.internalNotes,
          compatibilities: undefined,
        });
        report.updated++;
      } else {
        await repo.createProduct({ ...input, initialStock: initialStock ?? 0 }, "draft");
        report.created++;
      }
    } catch (e) {
      report.errors.push({ line, sku: sku || "—", message: e instanceof Error ? e.message : "Error desconocido" });
    }
  }
  return report;
}

export const EXPORT_COLUMNS = [
  "sku", "name", "status", "category", "brand", "model", "reference", "alt_codes", "sale_mode",
  "price", "currency", "cost", "on_hand", "reserved", "available", "min_stock", "location", "updated_at",
] as const;


/** Línea de pedido o de cotización usada para el ranking. */
export interface RankLine {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  lineTotal: number;
  currency: string;
  requestId: string;
}

export interface RankCandidate {
  productId: string;
  sku: string;
  name: string;
  imageUrl: string | null;
  currency: string;
}

function aggregate(lines: RankLine[], images: Map<string, string | null>) {
  const map = new Map<string, SalesRankRow & { _req: Set<string> }>();
  for (const l of lines) {
    const row = map.get(l.productId) ?? {
      productId: l.productId, sku: l.sku, name: l.name, imageUrl: images.get(l.productId) ?? null,
      units: 0, revenue: 0, currency: l.currency, orders: 0, _req: new Set<string>(),
    };
    row.units += l.quantity;
    row.revenue = Math.round((row.revenue + l.lineTotal) * 100) / 100;
    row._req.add(l.requestId);
    row.orders = row._req.size;
    map.set(l.productId, row);
  }
  return [...map.values()].map(({ _req: _r, ...r }) => r);
}

/**
 * Calcula el ranking a partir de líneas reales (nunca cifras inventadas).
 * "Menos vendidos" considera los productos publicados de compra directa, incluidos
 * los que no tienen ventas en el periodo, y excluye los que ya figuran como más vendidos.
 */
export function buildSalesRanking(sold: RankLine[], quoted: RankLine[], candidates: RankCandidate[], periodDays: number | null, limit = 5): SalesRanking {
  const images = new Map(candidates.map((c) => [c.productId, c.imageUrl]));
  const soldRows = aggregate(sold, images);
  const best = soldRows.filter((r) => r.units > 0).sort((a, b) => b.units - a.units || b.revenue - a.revenue || a.name.localeCompare(b.name, "es")).slice(0, limit);
  const bestIds = new Set(best.map((b) => b.productId));
  const byId = new Map(soldRows.map((r) => [r.productId, r]));
  const worst = candidates
    .filter((c) => !bestIds.has(c.productId))
    .map((c) => byId.get(c.productId) ?? { productId: c.productId, sku: c.sku, name: c.name, imageUrl: c.imageUrl, units: 0, revenue: 0, currency: c.currency, orders: 0 })
    .sort((a, b) => a.units - b.units || a.revenue - b.revenue || a.name.localeCompare(b.name, "es"))
    .slice(0, limit);
  const mostQuoted = aggregate(quoted, images).sort((a, b) => b.orders - a.orders || b.units - a.units).slice(0, limit);
  return { periodDays, best, worst, mostQuoted, totalUnits: sold.reduce((s, l) => s + l.quantity, 0) };
}

export function sinceDate(periodDays: number | null) {
  return periodDays ? new Date(Date.now() - periodDays * 86400000).toISOString() : null;
}
