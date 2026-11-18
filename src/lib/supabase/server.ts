import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(supabaseConfig.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function publicStorageUrl(bucket: string, path: string) {
  return `${supabaseConfig.url}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
