// Tipos de dominio compartidos por la tienda, el panel y ambos proveedores de datos
// (Supabase y modo demostración).

export type Role = "admin" | "editor" | "warehouse" | "reviewer";
export type ProductStatus = "draft" | "pending_photos" | "pending_review" | "published" | "archived";
export type SaleMode = "direct" | "quote";
export type Availability = "in_stock" | "low_stock" | "out_of_stock";
export type MovementType = "entry" | "exit" | "adjustment" | "reservation" | "release" | "sale";
export type OrderStatus = "received" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "refunded" | "not_applicable";
export type QuoteStatus = "new" | "in_review" | "sent" | "accepted" | "rejected" | "closed";

export type Permission =
  | "catalog.view"
  | "catalog.edit"
  | "catalog.publish"
  | "catalog.cost"
  | "inventory.manage"
  | "orders.view"
  | "orders.manage"
  | "quotes.manage"
  | "taxonomy.manage"
  | "data.import"
  | "data.export"
  | "users.manage"
  | "audit.view";

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  active: boolean;
  createdAt?: string;
}

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  active: boolean;
  productCount?: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  productCount?: number;
}

export interface Spec {
  label: string;
  value: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  storagePath: string;
  alt: string | null;
  position: number;
  isPrimary: boolean;
  width?: number | null;
  height?: number | null;
}

export interface ProductDocument {
  id: string;
  productId: string;
  title: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  isPublic: boolean;
  storagePath: string;
}

export interface Compatibility {
  id: string;
  productId: string;
  brand: string;
  model: string;
  notes: string | null;
  verified: boolean;
  verifiedAt: string | null;
}

/** Producto tal como lo ve un visitante: sin costo, ubicación ni existencias exactas. */
export interface CatalogProduct {
  id: string;
  sku: string;
  slug: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  subcategoryName: string | null;
  subcategorySlug: string | null;
  brandId: string | null;
  brandName: string | null;
  brandSlug: string | null;
  model: string | null;
  reference: string | null;
  altCodes: string[];
  shortDescription: string | null;
  price: number | null;
  currency: string;
  saleMode: SaleMode;
  featured: boolean;
  availability: Availability;
  imageUrl: string | null;
  publishedAt: string | null;
}

export interface CatalogProductDetail extends CatalogProduct {
  description: string | null;
  specs: Spec[];
  images: ProductImage[];
  documents: Omit<ProductDocument, "storagePath" | "isPublic">[];
  compatibilities: Compatibility[];
  related: CatalogProduct[];
}

export interface CatalogQuery {
  q?: string;
  category?: string; // slug
  brand?: string[]; // slugs
  availability?: "available" | "unavailable";
  mode?: SaleMode;
  minPrice?: number;
  maxPrice?: number;
  sort?: "relevance" | "newest" | "name" | "price_asc" | "price_desc";
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Producto completo para el panel administrativo. */
export interface AdminProduct {
  id: string;
  sku: string;
  slug: string;
  name: string;
  categoryId: string | null;
  subcategoryId: string | null;
  brandId: string | null;
  model: string | null;
  reference: string | null;
  altCodes: string[];
  shortDescription: string | null;
  description: string | null;
  specs: Spec[];
  price: number | null;
  currency: string;
  saleMode: SaleMode;
  status: ProductStatus;
  featured: boolean;
  minStock: number;
  location: string | null;
  internalNotes: string | null;
  /** null si el usuario no tiene permiso de ver costos. */
  cost: number | null;
  onHand: number;
  reserved: number;
  images: ProductImage[];
  documents: ProductDocument[];
  compatibilities: Compatibility[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface AdminProductRow {
  id: string;
  sku: string;
  name: string;
  status: ProductStatus;
  saleMode: SaleMode;
  price: number | null;
  currency: string;
  categoryName: string | null;
  brandName: string | null;
  onHand: number;
  reserved: number;
  minStock: number;
  imageUrl: string | null;
  imageCount: number;
  updatedAt: string;
}

export interface ProductInput {
  sku: string;
  slug?: string;
  name: string;
  categoryId: string | null;
  subcategoryId: string | null;
  brandId: string | null;
  model: string | null;
  reference: string | null;
  altCodes: string[];
  shortDescription: string | null;
  description: string | null;
  specs: Spec[];
  price: number | null;
  currency: string;
  saleMode: SaleMode;
  featured: boolean;
  minStock: number;
  location: string | null;
  internalNotes: string | null;
  cost?: number | null;
  /** Solo al crear: existencia inicial (se registra como movimiento de entrada). */
  initialStock?: number;
  compatibilities?: { brand: string; model: string; notes: string | null; verified: boolean }[];
}

export interface InventoryRow {
  productId: string;
  sku: string;
  name: string;
  status: ProductStatus;
  location: string | null;
  onHand: number;
  reserved: number;
  available: number;
  minStock: number;
  updatedAt: string | null;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  type: MovementType;
  onHandDelta: number;
  reservedDelta: number;
  onHandAfter: number;
  reservedAfter: number;
  reason: string;
  reference: string | null;
  actorLabel: string;
  createdAt: string;
}

export interface CustomerInput {
  name: string;
  company?: string | null;
  taxId?: string | null;
  email: string;
  phone: string;
  city?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface TimelineEvent {
  id: string;
  kind: "created" | "status" | "payment" | "note";
  fromValue: string | null;
  toValue: string | null;
  note: string | null;
  isInternal: boolean;
  actorLabel: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string | null;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  stockState: "reserved" | "consumed" | "released";
  customer: CustomerInput;
  currency: string;
  subtotal: number;
  total: number;
  items: OrderItem[];
  events: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface QuoteItem {
  productId: string | null;
  sku: string;
  name: string;
  quantity: number;
  notes: string | null;
}

export interface Quote {
  id: string;
  number: string;
  status: QuoteStatus;
  customer: CustomerInput;
  items: QuoteItem[];
  events: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderSummary {
  id: string;
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  customerName: string;
  company: string | null;
  email: string;
  currency: string;
  total: number;
  itemCount: number;
  createdAt: string;
}

export interface QuoteSummary {
  id: string;
  number: string;
  status: QuoteStatus;
  customerName: string;
  company: string | null;
  email: string;
  itemCount: number;
  createdAt: string;
}

export interface TrackingResult {
  kind: "order" | "quote";
  number: string;
  status: string;
  paymentStatus?: string;
  createdAt: string;
  total?: number;
  currency?: string;
  items: { sku: string; name: string; quantity: number }[];
  events: { to: string | null; note: string | null; at: string }[];
}

export interface DashboardStats {
  published: number;
  draft: number;
  pendingPhotos: number;
  pendingReview: number;
  archived: number;
  outOfStock: number;
  lowStock: number;
  ordersTotal: number;
  ordersOpen: number;
  quotesPending: number;
  /** Ventas con pago confirmado por el personal, agrupadas por moneda. */
  confirmedSales: { currency: string; amount: number; count: number }[];
  recentOrders: OrderSummary[];
  recentQuotes: QuoteSummary[];
  attention: AdminProductRow[];
}

/** Fila de ranking de ventas o cotizaciones de un producto. */
export interface SalesRankRow {
  productId: string;
  sku: string;
  name: string;
  imageUrl: string | null;
  units: number;
  revenue: number;
  currency: string;
  orders: number;
}

export interface SalesRanking {
  /** Días hacia atrás considerados; null = todo el historial. */
  periodDays: number | null;
  best: SalesRankRow[];
  worst: SalesRankRow[];
  mostQuoted: SalesRankRow[];
  totalUnits: number;
}

export interface AuditEntry {
  id: string;
  actorLabel: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface ImportRow {
  sku: string;
  name: string;
  category?: string;
  brand?: string;
  model?: string;
  reference?: string;
  alt_codes?: string;
  short_description?: string;
  description?: string;
  price?: string;
  currency?: string;
  sale_mode?: string;
  min_stock?: string;
  location?: string;
  initial_stock?: string;
}

export interface ImportReport {
  created: number;
  updated: number;
  skipped: number;
  errors: { line: number; sku: string; message: string }[];
}
