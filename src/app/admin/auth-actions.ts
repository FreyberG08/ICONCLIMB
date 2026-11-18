"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemoMode, site } from "@/lib/config";
import { createDemoToken, DEMO_COOKIE, demoPassword, safeEqual } from "@/lib/auth/demo-session";
import { db } from "@/lib/data/demo/store";
import { supabaseServer } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

const attempts = new Map<string, number[]>();
async function throttle() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter((t) => now - t < 15 * 60 * 1000);
  list.push(now);
  attempts.set(ip, list);
  return list.length <= 10;
}

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(6).max(200) });

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Correo o contraseña inválidos." };
  if (!(await throttle())) return { error: "Demasiados intentos. Espere unos minutos e intente nuevamente." };
  const { email, password } = parsed.data;

  if (isDemoMode) {
    const user = db().users.find((u) => u.email === email);
    if (!user || !safeEqual(password, demoPassword())) return { error: "Credenciales incorrectas." };
    if (!user.active) return { error: "Su cuenta está inactiva. Contacte a un administrador." };
    const { token, maxAge } = createDemoToken(user.id);
    (await cookies()).set(DEMO_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge });
  } else {
    const sb = await supabaseServer();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { error: "Credenciales incorrectas." };
  }
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/admin") && !next.startsWith("/admin/login") ? next : "/admin");
}

export async function logout() {
  if (isDemoMode) (await cookies()).delete(DEMO_COOKIE);
  else await (await supabaseServer()).auth.signOut();
  redirect("/admin/login");
}

export async function requestPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  if (isDemoMode) return { error: "En modo demostración la contraseña se define con la variable DEMO_PASSWORD." };
  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!email.success) return { error: "Indique un correo válido." };
  if (!(await throttle())) return { error: "Demasiados intentos. Espere unos minutos." };
  const sb = await supabaseServer();
  await sb.auth.resetPasswordForEmail(email.data, { redirectTo: `${site.url}/auth/callback?next=/admin/restablecer` });
  return { message: "Si el correo está registrado, recibirá un enlace para restablecer su contraseña." };
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  if (isDemoMode) return { error: "No disponible en modo demostración." };
  const pwd = String(form.get("password") ?? "");
  if (pwd.length < 10) return { error: "La contraseña debe tener al menos 10 caracteres." };
  if (pwd !== String(form.get("confirm") ?? "")) return { error: "Las contraseñas no coinciden." };
  const sb = await supabaseServer();
  const { error } = await sb.auth.updateUser({ password: pwd });
  if (error) return { error: "No se pudo actualizar la contraseña. Solicite un nuevo enlace." };
  redirect("/admin");
}
