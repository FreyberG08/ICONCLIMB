import type {
  AdminProduct, AdminProductRow, AuditEntry, Brand, CatalogProduct, CatalogProductDetail, CatalogQuery,
  Category, CustomerInput, DashboardStats, ImportReport, ImportRow, InventoryMovement, InventoryRow, Order,
  OrderStatus, OrderSummary, Paged, PaymentStatus, ProductDocument, ProductImage, ProductInput, ProductStatus,
  Quote, QuoteStatus, QuoteSummary, Role, StaffUser, TrackingResult,
} from "../types";

/** Error de negocio con mensaje apto para mostrarse al usuario. */
export class DomainError extends Error {
  constructor(message: string, public code: "forbidden" | "not_found" | "invalid" | "conflict" = "invalid") {
    super(message);
    this.name = "DomainError";
  }
}

export interface UploadFile {
  name: string;
  type: string;
  bytes: Uint8Array;
  width?: number | null;
  height?: number | null;
}

export interface PublicRepository {
  listCategories(): Promise<Category[]>;
  listBrands(): Promise<Brand[]>;
  searchCatalog(query: CatalogQuery): Promise<Paged<CatalogProduct>>;
  listFeatured(limit: number): Promise<CatalogProduct[]>;
  listNewArrivals(limit: number): Promise<CatalogProduct[]>;
  getProductBySlug(slug: string): Promise<CatalogProductDetail | null>;
  getProductsByIds(ids: string[]): Promise<CatalogProduct[]>;
  listPublishedForSitemap(): Promise<{ slug: string; updatedAt: string | null }[]>;
  createOrder(items: { productId: string; quantity: number }[], customer: CustomerInput): Promise<{ number: string; total: number; currency: string }>;
  createQuote(items: { productId: string | null; description: string | null; quantity: number; notes: string | null }[], customer: CustomerInput): Promise<{ number: string }>;
  track(number: string, email: string): Promise<TrackingResult | null>;
  getPublicDocumentUrl(documentId: string): Promise<string | null>;
}

export interface ProductListFilter {
  q?: string;
  status?: ProductStatus | "all";
  categoryId?: string;
  saleMode?: "direct" | "quote";
  stock?: "low" | "out";
  page?: number;
  pageSize?: number;
}

export interface AdminRepository {
  readonly user: StaffUser;
  dashboard(): Promise<DashboardStats>;

  listProducts(filter: ProductListFilter): Promise<Paged<AdminProductRow>>;
  getProduct(id: string): Promise<AdminProduct | null>;
  isSkuTaken(sku: string, exceptId?: string): Promise<boolean>;
  createProduct(input: ProductInput, status: ProductStatus): Promise<{ id: string }>;
  updateProduct(id: string, input: ProductInput): Promise<void>;
  setProductStatus(id: string, status: ProductStatus): Promise<void>;
  duplicateProduct(id: string): Promise<{ id: string }>;

  uploadImage(productId: string, file: UploadFile): Promise<ProductImage>;
  deleteImage(imageId: string): Promise<void>;
  reorderImages(productId: string, orderedIds: string[]): Promise<void>;
  setPrimaryImage(productId: string, imageId: string): Promise<void>;
  updateImageAlt(imageId: string, alt: string | null): Promise<void>;

  uploadDocument(productId: string, file: UploadFile, title: string, isPublic: boolean): Promise<ProductDocument>;
  updateDocument(documentId: string, patch: { title?: string; isPublic?: boolean }): Promise<void>;
  deleteDocument(documentId: string): Promise<void>;
  getDocumentUrl(documentId: string): Promise<string | null>;

  listInventory(filter: { q?: string; stock?: "low" | "out" }): Promise<InventoryRow[]>;
  recordMovement(input: { productId: string; type: "entry" | "exit" | "adjustment"; quantity: number; reason: string; reference: string | null }): Promise<void>;
  listMovements(filter: { productId?: string; type?: string; page?: number; pageSize?: number }): Promise<Paged<InventoryMovement>>;
  registerIntake(input: { sku: string; name: string; quantity: number; location: string | null; reason: string; categoryId: string | null }): Promise<{ id: string }>;

  listOrders(filter: { status?: OrderStatus | "open" | "all"; q?: string }): Promise<OrderSummary[]>;
  getOrder(id: string): Promise<Order | null>;
  setOrderStatus(id: string, status: OrderStatus, note: string | null): Promise<void>;
  setOrderPayment(id: string, status: PaymentStatus, note: string | null): Promise<void>;
  addOrderNote(id: string, note: string): Promise<void>;

  listQuotes(filter: { status?: QuoteStatus | "open" | "all"; q?: string }): Promise<QuoteSummary[]>;
  getQuote(id: string): Promise<Quote | null>;
  setQuoteStatus(id: string, status: QuoteStatus, note: string | null): Promise<void>;
  addQuoteNote(id: string, note: string): Promise<void>;

  listAllCategories(): Promise<Category[]>;
  saveCategory(id: string | null, input: { name: string; slug: string; parentId: string | null; description: string | null; position: number; active: boolean }): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  listAllBrands(): Promise<Brand[]>;
  saveBrand(id: string | null, input: { name: string; slug: string; active: boolean }): Promise<void>;
  deleteBrand(id: string): Promise<void>;

  exportProducts(): Promise<Record<string, string | number | null>[]>;
  importProducts(rows: ImportRow[], options: { updateExisting: boolean }): Promise<ImportReport>;

  listUsers(): Promise<StaffUser[]>;
  updateUser(id: string, patch: { role?: Role; active?: boolean; fullName?: string }): Promise<void>;
  listAudit(filter: { entity?: string; page?: number; pageSize?: number }): Promise<Paged<AuditEntry>>;
}
