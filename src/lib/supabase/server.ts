import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../config";

/** Cliente con la sesión del usuario (cookies). Todas las consultas pasan por RLS. */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Llamado desde un Server Component: el middleware se encarga de refrescar la sesión.
        }
      },
    },
  });
}

let anonClient: ReturnType<typeof createClient> | null = null;

/** Cliente anónimo sin sesión para el catálogo público (solo vistas publicadas). */
export function supabasePublic() {
  if (!anonClient) {
    anonClient = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anonClient;
}

/**
 * Cliente con clave de servicio. SOLO para invitar usuarios desde el panel.
 * Es opcional: si SUPABASE_SERVICE_ROLE_KEY no está definida, la invitación se hace
 * desde el panel de Supabase. Nunca se importa en código de cliente.
 */
export function supabaseService() {
  const key = serviceKey();
  if (!key) return null;
  return createClient(supabaseConfig.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Ejecuta una operación administrativa probando cada clave de servicio disponible
 * (formato nuevo sb_secret_… primero, luego la service_role heredada) hasta que
 * Supabase acepte una. Los proyectos nuevos pueden tener desactivadas las claves heredadas.
 */
export async function withServiceClient<T extends { error: { message?: string } | null }>(
  fn: (client: SupabaseClient) => Promise<T>,
): Promise<T | null> {
  const keys = serviceKeys();
  if (!keys.length) return null;
  let last: T | null = null;
  for (const { key } of keys) {
    const client = createClient(supabaseConfig.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    last = await fn(client);
    const msg = last.error?.message ?? "";
    if (!/invalid api key|legacy api keys are disabled|invalid jwt|unregistered api key/i.test(msg)) return last;
  }
  return last;
}

export function publicStorageUrl(bucket: string, path: string) {
  return `${supabaseConfig.url}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Clave de servicio sin espacios ni comillas accidentales al copiarla en Vercel. */
function clean(v: string | undefined) {
  return (v ?? "").trim().replace(/^["']|["']$/g, "");
}

/** Claves de servicio disponibles, en orden de preferencia (nueva primero). */
export function serviceKeys(): { name: string; key: string }[] {
  return [
    { name: "SUPABASE_SECRET_KEY", key: clean(process.env.SUPABASE_SECRET_KEY) },
    { name: "SUPABASE_SERVICE_ROLE_KEY", key: clean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
  ].filter((k) => k.key);
}

export function serviceKey() {
  return serviceKeys()[0]?.key ?? "";
}

/** Proyecto al que pertenece una clave JWT heredada (campo "ref"); null si no aplica. */
export function keyProjectRef(key: string): string | null {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

export function urlProjectRef(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    return host.endsWith(".supabase.co") ? host.split(".")[0] : null;
  } catch {
    return null;
  }
}
