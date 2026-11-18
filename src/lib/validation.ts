import { z } from "zod";
import { CURRENCIES } from "./config";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._/-]{1,39}$/;

export const specSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(240),
});

export const compatibilitySchema = z.object({
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  notes: optionalText(300),
  verified: z.boolean().default(false),
});

export const productInputSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase().replace(/\s+/g, "-"))
      .pipe(z.string().regex(SKU_PATTERN, "SKU inválido: use letras mayúsculas, números, guiones o puntos (2 a 40 caracteres)")),
    slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug inválido").optional(),
    name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(160),
    categoryId: z.string().uuid().nullable().or(z.literal("").transform(() => null)),
    subcategoryId: z.string().uuid().nullable().or(z.literal("").transform(() => null)),
    brandId: z.string().uuid().nullable().or(z.literal("").transform(() => null)),
    model: optionalText(120),
    reference: optionalText(120),
    altCodes: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    shortDescription: optionalText(280),
    description: optionalText(8000),
    specs: z.array(specSchema).max(60).default([]),
    price: z.number().nonnegative().max(99999999).nullable(),
    currency: z.enum(CURRENCIES),
    saleMode: z.enum(["direct", "quote"]),
    featured: z.boolean().default(false),
    minStock: z.number().int().min(0).max(100000).default(0),
    location: optionalText(120),
    internalNotes: optionalText(2000),
    cost: z.number().nonnegative().max(99999999).nullable().optional(),
    initialStock: z.number().int().min(0).max(1000000).optional(),
    compatibilities: z.array(compatibilitySchema).max(100).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.saleMode === "direct" && v.price != null && v.price <= 0) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "El precio debe ser mayor que cero" });
    }
    if (v.subcategoryId && v.subcategoryId === v.categoryId) {
      ctx.addIssue({ code: "custom", path: ["subcategoryId"], message: "La subcategoría debe ser distinta de la categoría" });
    }
  });

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Indique su nombre").max(120),
  company: optionalText(160),
  taxId: optionalText(40),
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido").max(160),
  phone: z
    .string()
    .trim()
    .min(7, "Teléfono inválido")
    .max(30)
    .regex(/^[0-9+()\-.\s]+$/, "Teléfono inválido"),
  city: optionalText(80),
  address: optionalText(300),
  notes: optionalText(2000),
});

export const cartItemsSchema = z
  .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(9999) }))
  .min(1, "El carrito está vacío")
  .max(50);

export const quoteItemsSchema = z
  .array(
    z
      .object({
        productId: z.string().uuid().nullable(),
        description: optionalText(200),
        quantity: z.number().int().min(1).max(99999),
        notes: optionalText(500),
      })
      .refine((v) => v.productId || (v.description && v.description.length >= 3), {
        message: "Describa la pieza que necesita (referencia, marca o modelo)",
      }),
  )
  .min(1, "La lista de cotización está vacía")
  .max(50);

export const movementSchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(["entry", "exit", "adjustment"]),
  quantity: z.number().int().min(0).max(1000000),
  reason: z.string().trim().min(3, "Indique el motivo (mínimo 3 caracteres)").max(300),
  reference: optionalText(80),
});

export const intakeSchema = z.object({
  sku: productInputSchema.shape.sku,
  name: z.string().trim().min(3).max(160),
  quantity: z.number().int().min(0).max(1000000),
  location: optionalText(120),
  reason: z.string().trim().min(3).max(300),
  categoryId: z.string().uuid().nullable().or(z.literal("").transform(() => null)),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug inválido").optional(),
  parentId: z.string().uuid().nullable().or(z.literal("").transform(() => null)),
  description: optionalText(400),
  position: z.number().int().min(0).max(10000).default(0),
  active: z.boolean().default(true),
});

export const brandSchema = z.object({
  name: z.string().trim().min(1).max(80),
  active: z.boolean().default(true),
});

export function firstError(err: z.ZodError) {
  const issue = err.issues[0];
  return issue ? issue.message : "Datos inválidos";
}
