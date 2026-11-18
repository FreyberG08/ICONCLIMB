"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPublicRepo, DomainError } from "@/lib/data";
import { cartItemsSchema, customerSchema, firstError, quoteItemsSchema } from "@/lib/validation";
import type { CatalogProduct, TrackingResult } from "@/lib/types";
import { z } from "zod";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

// Límite básico por IP para formularios públicos (mitigación de abuso; complementar con
// un WAF o CAPTCHA como Cloudflare Turnstile en producción).
const hits = new Map<string, number[]>();
async function rateLimit(key: string, max = 8, windowMs = 10 * 60 * 1000) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const id = `${key}:${ip}`;
  const now = Date.now();
  const list = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) return false;
  list.push(now);
  hits.set(id, list);
  return true;
}

function errorMessage(e: unknown) {
  if (e instanceof DomainError) return e.message;
  console.error(e);
  return "No pudimos procesar la solicitud. Intente nuevamente en unos minutos.";
}

/** Datos actuales (precio, disponibilidad) de los productos del carrito o lista. */
export async function refreshProducts(ids: string[]): Promise<CatalogProduct[]> {
  const valid = z.array(z.string().uuid()).max(60).safeParse(ids);
  if (!valid.success) return [];
  return getPublicRepo().getProductsByIds(valid.data);
}

export async function placeOrder(input: { items: unknown; customer: unknown; website?: string }): Promise<Result<{ number: string; total: number; currency: string }>> {
  if (input.website) return { ok: false, error: "No se pudo enviar el formulario." };
  const items = cartItemsSchema.safeParse(input.items);
  if (!items.success) return { ok: false, error: firstError(items.error) };
  const customer = customerSchema.safeParse(input.customer);
  if (!customer.success) return { ok: false, error: firstError(customer.error) };
  if (!(await rateLimit("order"))) return { ok: false, error: "Demasiadas solicitudes. Intente más tarde o contáctenos por WhatsApp." };
  try {
    const res = await getPublicRepo().createOrder(items.data, customer.data);
    revalidatePath("/", "layout");
    return { ok: true, data: res };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function submitQuote(input: { items: unknown; customer: unknown; website?: string }): Promise<Result<{ number: string }>> {
  if (input.website) return { ok: false, error: "No se pudo enviar el formulario." };
  const items = quoteItemsSchema.safeParse(input.items);
  if (!items.success) return { ok: false, error: firstError(items.error) };
  const customer = customerSchema.safeParse(input.customer);
  if (!customer.success) return { ok: false, error: firstError(customer.error) };
  if (!(await rateLimit("quote"))) return { ok: false, error: "Demasiadas solicitudes. Intente más tarde o contáctenos por WhatsApp." };
  try {
    const res = await getPublicRepo().createQuote(
      items.data.map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity, notes: i.notes })),
      customer.data,
    );
    return { ok: true, data: res };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function trackRequest(number: string, email: string): Promise<Result<TrackingResult | null>> {
  const parsed = z.object({ number: z.string().trim().min(6).max(30), email: z.string().trim().email() }).safeParse({ number, email });
  if (!parsed.success) return { ok: false, error: "Indique un número de referencia y un correo válidos." };
  if (!(await rateLimit("track", 30))) return { ok: false, error: "Demasiadas consultas. Intente más tarde." };
  try {
    return { ok: true, data: await getPublicRepo().track(parsed.data.number, parsed.data.email) };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
