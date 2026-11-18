"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminRepo, DomainError } from "@/lib/data";
import { isDemoMode, site } from "@/lib/config";
import { slugify } from "@/lib/format";
import { can } from "@/lib/permissions";
import { resetDemo } from "@/lib/data/demo/store";
import { supabaseService } from "@/lib/supabase/server";
import {
  brandSchema, categorySchema, firstError, intakeSchema, movementSchema, productInputSchema,
} from "@/lib/validation";
import type { ImportReport, ImportRow, OrderStatus, PaymentStatus, ProductStatus, QuoteStatus, Role } from "@/lib/types";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: e.message };
    // redirect()/notFound() de Next.js deben propagarse.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error("[ICON admin]", e);
    return { ok: false, error: "Ocurrió un error inesperado. Intente nuevamente." };
  }
}

/** Refresca la tienda pública: los cambios aparecen sin volver a desplegar. */
function refreshStore() {
  revalidatePath("/", "layout");
}

const uuid = z.string().uuid();
const STATUSES = ["draft", "pending_photos", "pending_review", "published", "archived"] as const;

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------
export async function saveProduct(id: string | null, payload: unknown, targetStatus?: ProductStatus): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const parsed = productInputSchema.safeParse(payload);
    if (!parsed.success) throw new DomainError(firstError(parsed.error));
    const input = parsed.data;
    const repo = await getAdminRepo("catalog.edit");
    const status = targetStatus && (STATUSES as readonly string[]).includes(targetStatus) ? targetStatus : undefined;
    let productId: string;
    if (id) {
      uuid.parse(id);
      await repo.updateProduct(id, input);
      if (status) await repo.setProductStatus(id, status);
      productId = id;
    } else {
      // Un producto nuevo nunca nace publicado: se crea en borrador y luego, si
      // el usuario tiene permiso, se aplica el estado solicitado (misma regla que la BD).
      const created = await repo.createProduct({ ...input, slug: input.slug ?? slugify(`${input.name}-${input.sku}`) }, "draft");
      productId = created.id;
      if (status && status !== "draft") await repo.setProductStatus(productId, status);
    }
    revalidatePath("/admin/productos");
    refreshStore();
    return { id: productId };
  });
}

export async function setProductStatusAction(id: string, status: ProductStatus): Promise<ActionResult> {
  return run(async () => {
    uuid.parse(id);
    if (!(STATUSES as readonly string[]).includes(status)) throw new DomainError("Estado inválido");
    const repo = await getAdminRepo("catalog.view");
    await repo.setProductStatus(id, status);
    revalidatePath("/admin/productos");
    revalidatePath(`/admin/productos/${id}`);
    refreshStore();
    return undefined;
  });
}

export async function duplicateProductAction(id: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    uuid.parse(id);
    const repo = await getAdminRepo("catalog.edit");
    const res = await repo.duplicateProduct(id);
    revalidatePath("/admin/productos");
    return res;
  });
}

export async function deleteImageAction(productId: string, imageId: string): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("catalog.edit");
    await repo.deleteImage(uuid.parse(imageId));
    revalidatePath(`/admin/productos/${productId}`);
    refreshStore();
    return undefined;
  });
}

export async function reorderImagesAction(productId: string, ids: string[]): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("catalog.edit");
    await repo.reorderImages(uuid.parse(productId), z.array(uuid).max(60).parse(ids));
    refreshStore();
    return undefined;
  });
}

export async function setPrimaryImageAction(productId: string, imageId: string): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("catalog.edit");
    await repo.setPrimaryImage(uuid.parse(productId), uuid.parse(imageId));
    refreshStore();
    return undefined;
  });
}

export async function updateImageAltAction(imageId: string, alt: string): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("catalog.edit");
    await repo.updateImageAlt(uuid.parse(imageId), alt.trim().slice(0, 200) || null);
    refreshStore();
    return undefined;
  });
}

export async function updateDocumentAction(documentId: string, patch: { title?: string; isPublic?: boolean }): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("catalog.edit");
    const p = z.object({ title: z.string().trim().min(2).max(160).optional(), isPublic: z.boolean().optional() }).parse(patch);
    await repo.updateDocument(uuid.parse(documentId), p);
    refreshStore();
    return undefined;
  });
}

export async function deleteDocumentAction(documentId: string): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("catalog.edit");
    await repo.deleteDocument(uuid.parse(documentId));
    refreshStore();
    return undefined;
  });
}

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------
export async function recordMovementAction(payload: unknown): Promise<ActionResult> {
  return run(async () => {
    const parsed = movementSchema.safeParse(payload);
    if (!parsed.success) throw new DomainError(firstError(parsed.error));
    const repo = await getAdminRepo("inventory.manage");
    await repo.recordMovement(parsed.data);
    revalidatePath("/admin/inventario");
    revalidatePath(`/admin/productos/${parsed.data.productId}`);
    refreshStore();
    return undefined;
  });
}

export async function registerIntakeAction(payload: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const parsed = intakeSchema.safeParse(payload);
    if (!parsed.success) throw new DomainError(firstError(parsed.error));
    const repo = await getAdminRepo();
    const res = await repo.registerIntake({ ...parsed.data, reason: parsed.data.reason });
    revalidatePath("/admin/inventario");
    revalidatePath("/admin/productos");
    return res;
  });
}

// ---------------------------------------------------------------------------
// Pedidos y cotizaciones
// ---------------------------------------------------------------------------
const note = z.string().trim().max(2000).transform((v) => v || null).nullable();

export async function setOrderStatusAction(id: string, status: OrderStatus, n: string | null): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("orders.manage");
    await repo.setOrderStatus(uuid.parse(id), z.enum(["received", "confirmed", "preparing", "shipped", "delivered", "cancelled"]).parse(status), note.parse(n));
    revalidatePath(`/admin/pedidos/${id}`);
    revalidatePath("/admin/pedidos");
    refreshStore();
    return undefined;
  });
}

export async function setOrderPaymentAction(id: string, status: PaymentStatus, n: string | null): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("orders.manage");
    await repo.setOrderPayment(uuid.parse(id), z.enum(["pending", "paid", "refunded", "not_applicable"]).parse(status), note.parse(n));
    revalidatePath(`/admin/pedidos/${id}`);
    return undefined;
  });
}

export async function addOrderNoteAction(id: string, n: string): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("orders.manage");
    await repo.addOrderNote(uuid.parse(id), z.string().trim().min(1, "La nota está vacía").max(2000).parse(n));
    revalidatePath(`/admin/pedidos/${id}`);
    return undefined;
  });
}

export async function setQuoteStatusAction(id: string, status: QuoteStatus, n: string | null): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("quotes.manage");
    await repo.setQuoteStatus(uuid.parse(id), z.enum(["new", "in_review", "sent", "accepted", "rejected", "closed"]).parse(status), note.parse(n));
    revalidatePath(`/admin/cotizaciones/${id}`);
    revalidatePath("/admin/cotizaciones");
    return undefined;
  });
}

export async function addQuoteNoteAction(id: string, n: string): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("quotes.manage");
    await repo.addQuoteNote(uuid.parse(id), z.string().trim().min(1, "La nota está vacía").max(2000).parse(n));
    revalidatePath(`/admin/cotizaciones/${id}`);
    return undefined;
  });
}

// ---------------------------------------------------------------------------
// Taxonomía
// ---------------------------------------------------------------------------
export async function saveCategoryAction(id: string | null, payload: unknown): Promise<ActionResult> {
  return run(async () => {
    const parsed = categorySchema.safeParse(payload);
    if (!parsed.success) throw new DomainError(firstError(parsed.error));
    const repo = await getAdminRepo("taxonomy.manage");
    const v = parsed.data;
    await repo.saveCategory(id ? uuid.parse(id) : null, { ...v, slug: v.slug || slugify(v.name) });
    revalidatePath("/admin/categorias");
    refreshStore();
    return undefined;
  });
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("taxonomy.manage");
    await repo.deleteCategory(uuid.parse(id));
    revalidatePath("/admin/categorias");
    refreshStore();
    return undefined;
  });
}

export async function saveBrandAction(id: string | null, payload: unknown): Promise<ActionResult> {
  return run(async () => {
    const parsed = brandSchema.safeParse(payload);
    if (!parsed.success) throw new DomainError(firstError(parsed.error));
    const repo = await getAdminRepo("taxonomy.manage");
    await repo.saveBrand(id ? uuid.parse(id) : null, { ...parsed.data, slug: slugify(parsed.data.name) });
    revalidatePath("/admin/marcas");
    refreshStore();
    return undefined;
  });
}

export async function deleteBrandAction(id: string): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("taxonomy.manage");
    await repo.deleteBrand(uuid.parse(id));
    revalidatePath("/admin/marcas");
    refreshStore();
    return undefined;
  });
}

// ---------------------------------------------------------------------------
// Importación
// ---------------------------------------------------------------------------
const importRowSchema = z.object({ sku: z.string().max(60), name: z.string().max(200) }).passthrough();

export async function importProductsAction(rows: unknown, updateExisting: boolean): Promise<ActionResult<ImportReport>> {
  return run(async () => {
    const parsed = z.array(importRowSchema).max(2000).safeParse(rows);
    if (!parsed.success) throw new DomainError("El archivo no tiene el formato esperado (columnas sku y name obligatorias).");
    const repo = await getAdminRepo("data.import");
    const clean = parsed.data.map((r) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) if (typeof v === "string") out[k.trim().toLowerCase()] = v.slice(0, 8000);
      return out as unknown as ImportRow;
    });
    const report = await repo.importProducts(clean, { updateExisting: !!updateExisting });
    revalidatePath("/admin/productos");
    refreshStore();
    return report;
  });
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------
const roleSchema = z.enum(["admin", "editor", "warehouse", "reviewer"]);

export async function updateUserAction(id: string, patch: { role?: Role; active?: boolean; fullName?: string }): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("users.manage");
    const p = z.object({ role: roleSchema.optional(), active: z.boolean().optional(), fullName: z.string().trim().max(120).optional() }).parse(patch);
    await repo.updateUser(uuid.parse(id), p);
    revalidatePath("/admin/usuarios");
    return undefined;
  });
}

export async function inviteUserAction(payload: { email: string; fullName: string; role: Role }): Promise<ActionResult<{ message: string }>> {
  return run(async () => {
    const repo = await getAdminRepo("users.manage");
    const p = z.object({ email: z.string().trim().toLowerCase().email(), fullName: z.string().trim().min(2).max(120), role: roleSchema }).parse(payload);
    if (isDemoMode) throw new DomainError("En modo demostración no se pueden invitar usuarios.");
    const service = supabaseService();
    if (!service) {
      throw new DomainError("Configure SUPABASE_SERVICE_ROLE_KEY en el servidor para invitar desde aquí, o invite al usuario desde el panel de Supabase (Authentication › Users).");
    }
    const { data, error } = await service.auth.admin.inviteUserByEmail(p.email, {
      data: { full_name: p.fullName },
      redirectTo: `${site.url}/auth/callback?next=/admin/restablecer`,
    });
    if (error || !data.user) throw new DomainError(error?.message ?? "No se pudo enviar la invitación");
    // El perfil se crea inactivo por el trigger; el administrador lo activa con el rol elegido.
    await repo.updateUser(data.user.id, { role: p.role, active: true, fullName: p.fullName });
    revalidatePath("/admin/usuarios");
    return { message: `Invitación enviada a ${p.email}.` };
  });
}

export async function resetDemoAction(): Promise<ActionResult> {
  return run(async () => {
    const repo = await getAdminRepo("users.manage");
    if (!isDemoMode || !can(repo.user.role, "users.manage")) throw new DomainError("Solo disponible en modo demostración.");
    resetDemo();
    revalidatePath("/", "layout");
    return undefined;
  });
}
