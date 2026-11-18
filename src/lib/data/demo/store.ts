import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AuditEntry, Brand, Category, Compatibility, InventoryMovement, Order, ProductDocument, ProductImage,
  ProductStatus, Quote, Role, SaleMode, Spec,
} from "../../types";
import { buildSearchText } from "../shared";

// ---------------------------------------------------------------------------
// MODO DEMOSTRACIÓN
// Base de datos local en un archivo JSON. Sirve para evaluar la plataforma sin
// credenciales de Supabase. Replica las mismas reglas de negocio (permisos,
// estados, reservas e inventario). No apto para producción.
// ---------------------------------------------------------------------------

export interface DemoProduct {
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
  cost: number | null;
  searchText: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface DemoDB {
  version: number;
  users: DemoUser[];
  categories: Category[];
  brands: Brand[];
  products: DemoProduct[];
  images: Omit<ProductImage, "url">[];
  documents: ProductDocument[];
  compatibilities: Compatibility[];
  inventory: Record<string, { onHand: number; reserved: number; updatedAt: string }>;
  movements: Omit<InventoryMovement, "sku" | "productName">[];
  orders: Order[];
  quotes: Quote[];
  audit: AuditEntry[];
  seq: { order: number; quote: number; movement: number; audit: number; event: number };
}

const DB_VERSION = 1;

export const DEMO_DIR = process.env.DEMO_DATA_DIR || (process.env.VERCEL ? "/tmp/icon-demo" : path.join(process.cwd(), ".demo-data"));
const DB_FILE = path.join(DEMO_DIR, "db.json");
export const DEMO_UPLOADS = path.join(DEMO_DIR, "uploads");

const g = globalThis as unknown as { __iconDemoDb?: DemoDB };

export function now() {
  return new Date().toISOString();
}

export function uid() {
  return randomUUID();
}

function seed(): DemoDB {
  const t = now();
  const cat = (name: string, slug: string, description: string, position: number): Category => ({
    id: uid(), parentId: null, name, slug, description, position, active: true,
  });
  const categories = [
    cat("Tarjetas y electrónica", "tarjetas-y-electronica", "Tarjetas de control, maniobra, comunicación y módulos electrónicos.", 10),
    cat("Variadores y componentes eléctricos", "variadores-y-componentes-electricos", "Variadores de frecuencia, contactores, relés, fuentes y protecciones.", 20),
    cat("Botoneras y displays", "botoneras-y-displays", "Pulsadores, botoneras de cabina y piso, indicadores y displays.", 30),
    cat("Puertas y operadores", "puertas-y-operadores", "Operadores de puerta, patines, poleas, cerraduras y accesorios.", 40),
    cat("Sensores y dispositivos de seguridad", "sensores-y-seguridad", "Cortinas de luz, finales de carrera, sensores y dispositivos de seguridad.", 50),
    cat("Motores y frenos", "motores-y-frenos", "Máquinas de tracción, motores, frenos y encoders.", 60),
    cat("Componentes mecánicos", "componentes-mecanicos", "Guiadores, rodamientos, poleas, amortiguadores y piezas de tracción.", 70),
    cat("Accesorios y consumibles", "accesorios-y-consumibles", "Lubricantes, herramientas, cableado y consumibles de mantenimiento.", 80),
    cat("Repuestos especiales y bajo pedido", "repuestos-especiales", "Piezas que requieren validación técnica o importación bajo pedido.", 90),
  ];
  const bySlug = (s: string) => categories.find((c) => c.slug === s)!.id;
  const brands: Brand[] = [
    { id: uid(), name: "Marca Demo A", slug: "marca-demo-a", active: true },
    { id: uid(), name: "Marca Demo B", slug: "marca-demo-b", active: true },
  ];

  type SeedProduct = Partial<DemoProduct> & { sku: string; name: string; category: string; stock: number };
  const items: SeedProduct[] = [
    {
      sku: "DEMO-TC-0001", name: "Tarjeta de control de maniobra", category: "tarjetas-y-electronica",
      shortDescription: "Producto de demostración. Tarjeta electrónica para control de maniobra.",
      saleMode: "quote", stock: 2, featured: true, brandId: brands[0].id, model: "DM-100", reference: "REF-DEMO-100",
      specs: [{ label: "Alimentación", value: "Dato de ejemplo" }, { label: "Entradas / salidas", value: "Dato de ejemplo" }],
    },
    {
      sku: "DEMO-PB-0002", name: "Pulsador de cabina con indicador luminoso", category: "botoneras-y-displays",
      shortDescription: "Producto de demostración. Pulsador redondo con anillo luminoso.",
      saleMode: "direct", price: 18.5, stock: 40, featured: true, brandId: brands[1].id, model: "PB-22",
      specs: [{ label: "Diámetro", value: "Dato de ejemplo" }, { label: "Tensión", value: "Dato de ejemplo" }],
    },
    {
      sku: "DEMO-CL-0003", name: "Cortina de luz para puerta de cabina", category: "sensores-y-seguridad",
      shortDescription: "Producto de demostración. Barrera infrarroja de detección para puertas.",
      saleMode: "direct", price: 145, stock: 6, minStock: 3, featured: true, brandId: brands[0].id, model: "CL-2000",
    },
    {
      sku: "DEMO-OP-0004", name: "Operador de puerta de cabina", category: "puertas-y-operadores",
      shortDescription: "Producto de demostración. Requiere validación técnica antes de cotizar.",
      saleMode: "quote", stock: 0, brandId: brands[1].id, model: "OP-V3",
    },
    {
      sku: "DEMO-CT-0005", name: "Contactor trifásico de maniobra", category: "variadores-y-componentes-electricos",
      shortDescription: "Producto de demostración. Contactor para circuito de potencia.",
      saleMode: "direct", price: 62, stock: 2, minStock: 4, brandId: brands[0].id, featured: true,
    },
    {
      sku: "DEMO-GD-0006", name: "Guiador de cabina con rodillos", category: "componentes-mecanicos",
      shortDescription: "Producto de demostración. Juego de guiadores de rodillo.",
      saleMode: "direct", price: 89.9, stock: 12, brandId: brands[1].id,
    },
    {
      sku: "DEMO-LB-0007", name: "Lubricante para guías (1 L)", category: "accesorios-y-consumibles",
      shortDescription: "Producto de demostración. Consumible de mantenimiento preventivo.",
      saleMode: "direct", price: 14, stock: 0,
    },
    {
      sku: "DEMO-EN-0008", name: "Encoder incremental para máquina de tracción", category: "motores-y-frenos",
      shortDescription: "Producto de demostración. Encoder de realimentación de velocidad.",
      saleMode: "quote", stock: 3, brandId: brands[0].id, model: "EN-1024",
    },
  ];

  const products: DemoProduct[] = [];
  const inventory: DemoDB["inventory"] = {};
  const movements: DemoDB["movements"] = [];
  let mv = 0;
  for (const it of items) {
    const id = uid();
    const brandName = brands.find((b) => b.id === it.brandId)?.name ?? null;
    const p: DemoProduct = {
      id,
      sku: it.sku,
      slug: it.sku.toLowerCase(),
      name: it.name,
      categoryId: bySlug(it.category),
      subcategoryId: null,
      brandId: it.brandId ?? null,
      model: it.model ?? null,
      reference: it.reference ?? null,
      altCodes: [],
      shortDescription: it.shortDescription ?? null,
      description:
        "Ficha de demostración generada automáticamente para mostrar el funcionamiento de la plataforma. " +
        "No representa un producto real del inventario de Ascensores CLIMB. Las características técnicas, compatibilidades y precios definitivos se cargan desde el panel administrativo.",
      specs: it.specs ?? [],
      price: it.price ?? null,
      currency: "USD",
      saleMode: it.saleMode ?? "quote",
      status: "published",
      featured: it.featured ?? false,
      minStock: it.minStock ?? 1,
      location: "Almacén demo",
      internalNotes: null,
      cost: null,
      searchText: "",
      createdAt: t,
      updatedAt: t,
      publishedAt: t,
    };
    p.searchText = buildSearchText(p, brandName);
    products.push(p);
    inventory[id] = { onHand: it.stock, reserved: 0, updatedAt: t };
    if (it.stock > 0) {
      movements.push({
        id: String(++mv), productId: id, type: "entry", onHandDelta: it.stock, reservedDelta: 0,
        onHandAfter: it.stock, reservedAfter: 0, reason: "Inventario inicial (demostración)", reference: null,
        actorLabel: "Sistema", createdAt: t,
      });
    }
  }

  // Un producto en borrador y otro pendiente de fotografías para mostrar el flujo editorial.
  for (const [sku, name, status] of [
    ["DEMO-FR-0009", "Freno electromagnético (en preparación)", "pending_photos"],
    ["DEMO-DP-0010", "Display de piso (borrador)", "draft"],
  ] as const) {
    const id = uid();
    const p: DemoProduct = {
      id, sku, slug: sku.toLowerCase(), name, categoryId: null, subcategoryId: null, brandId: null, model: null,
      reference: null, altCodes: [], shortDescription: null, description: null, specs: [], price: null, currency: "USD",
      saleMode: "quote", status, featured: false, minStock: 0, location: null, internalNotes: null, cost: null,
      searchText: "", createdAt: t, updatedAt: t, publishedAt: null,
    };
    p.searchText = buildSearchText(p, null);
    products.push(p);
    inventory[id] = { onHand: 0, reserved: 0, updatedAt: t };
  }

  const users: DemoUser[] = [
    { id: uid(), email: "admin@icon.demo", fullName: "Administrador (demo)", role: "admin", active: true, createdAt: t },
    { id: uid(), email: "editor@icon.demo", fullName: "Editor de catálogo (demo)", role: "editor", active: true, createdAt: t },
    { id: uid(), email: "almacen@icon.demo", fullName: "Almacén (demo)", role: "warehouse", active: true, createdAt: t },
    { id: uid(), email: "revisor@icon.demo", fullName: "Revisor (demo)", role: "reviewer", active: true, createdAt: t },
  ];

  return {
    version: DB_VERSION,
    users,
    categories,
    brands,
    products,
    images: [],
    documents: [],
    compatibilities: [],
    inventory,
    movements,
    orders: [],
    quotes: [],
    audit: [],
    seq: { order: 0, quote: 0, movement: mv, audit: 0, event: 0 },
  };
}

export function db(): DemoDB {
  if (g.__iconDemoDb) return g.__iconDemoDb;
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as DemoDB;
    if (parsed.version === DB_VERSION) {
      g.__iconDemoDb = parsed;
      return parsed;
    }
  } catch {
    // Sin archivo previo: se crea una base nueva.
  }
  g.__iconDemoDb = seed();
  persist();
  return g.__iconDemoDb;
}

export function persist() {
  if (!g.__iconDemoDb) return;
  try {
    fs.mkdirSync(DEMO_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(g.__iconDemoDb));
    fs.renameSync(tmp, DB_FILE);
  } catch (e) {
    // En entornos de solo lectura el modo demo sigue funcionando en memoria.
    console.warn("[ICON demo] No se pudo guardar la base local:", (e as Error).message);
  }
}

export function demoFileUrl(storagePath: string) {
  return `/api/demo-files/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
}

export function resetDemo() {
  g.__iconDemoDb = seed();
  persist();
}
