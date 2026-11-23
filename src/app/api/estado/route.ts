import { NextResponse } from "next/server";
import { isDemoMode, SUPABASE_KEY_VARS, SUPABASE_URL_VARS, supabaseConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico de configuración. Muestra SOLO qué variables existen (true/false),
 * nunca sus valores. Útil para verificar la conexión con Supabase tras desplegar.
 */
export async function GET() {
  const present = (names: readonly string[]) => Object.fromEntries(names.map((n) => [n, Boolean(process.env[n]?.trim())]));
  let conexion: "no_configurada" | "ok" | "error" = "no_configurada";
  let detalle: string | undefined;
  if (!isDemoMode) {
    try {
      const res = await fetch(`${supabaseConfig.url}/rest/v1/catalog_categories?select=id&limit=1`, {
        headers: { apikey: supabaseConfig.anonKey, Authorization: `Bearer ${supabaseConfig.anonKey}` },
        cache: "no-store",
      });
      conexion = res.ok ? "ok" : "error";
      if (!res.ok) detalle = `Supabase respondió ${res.status}. Revise la clave y que la migración esté aplicada.`;
    } catch {
      conexion = "error";
      detalle = "No se pudo contactar a Supabase. Revise la dirección del proyecto.";
    }
  }
  return NextResponse.json(
    {
      modo: isDemoMode ? "demostracion" : "supabase",
      forzado_demo: process.env.ICON_DEMO_MODE === "true",
      variables_direccion: present(SUPABASE_URL_VARS),
      variables_clave: present(SUPABASE_KEY_VARS),
      site_url: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      clave_servicio_para_usuarios: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY),
      conexion,
      ...(detalle ? { detalle } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
