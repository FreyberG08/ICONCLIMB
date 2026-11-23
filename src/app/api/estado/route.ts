import { NextResponse } from "next/server";
import { isDemoMode, SUPABASE_KEY_VARS, SUPABASE_URL_VARS, supabaseConfig } from "@/lib/config";
import { keyProjectRef, serviceKeys, urlProjectRef } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico de configuración. Muestra SOLO qué variables existen y a qué proyecto
 * pertenecen las claves (el identificador del proyecto ya es público en su URL);
 * nunca muestra los valores de las claves.
 */
function values_invalid(m: Record<string, string>) {
  return Object.values(m).some((v) => v !== "ok");
}

export async function GET() {
  const present = (names: readonly string[]) => Object.fromEntries(names.map((n) => [n, Boolean(process.env[n]?.trim())]));
  let conexion: "no_configurada" | "ok" | "error" = "no_configurada";
  let detalle: string | undefined;
  let claveServicio: "no_configurada" | "ok" | "invalida" | "error" = "no_configurada";
  const keys = serviceKeys();
  const porVariable: Record<string, string> = {};
  const svc = keys[0]?.key ?? "";

  if (!isDemoMode) {
    try {
      const res = await fetch(`${supabaseConfig.url}/rest/v1/catalog_categories?select=id&limit=1`, {
        headers: { apikey: supabaseConfig.anonKey, Authorization: `Bearer ${supabaseConfig.anonKey}` },
        cache: "no-store",
      });
      conexion = res.ok ? "ok" : "error";
      if (!res.ok) detalle = `Supabase respondió ${res.status}. Revise la clave pública y que la migración esté aplicada.`;
    } catch {
      conexion = "error";
      detalle = "No se pudo contactar a Supabase. Revise la dirección del proyecto.";
    }
    for (const { name, key } of keys) {
      try {
        const res = await fetch(`${supabaseConfig.url}/auth/v1/admin/users?page=1&per_page=1`, {
          headers: { apikey: key, ...(key.split(".").length === 3 ? { Authorization: `Bearer ${key}` } : {}) },
          cache: "no-store",
        });
        porVariable[name] = res.ok ? "ok" : res.status === 401 || res.status === 403 ? "invalida" : `error ${res.status}`;
      } catch {
        porVariable[name] = "error";
      }
    }
    const values = Object.values(porVariable);
    if (values.length) claveServicio = values.includes("ok") ? "ok" : values.every((v) => v === "invalida") ? "invalida" : "error";
  }

  const proyectoUrl = urlProjectRef(supabaseConfig.url);
  const proyectoClavePublica = keyProjectRef(supabaseConfig.anonKey);
  const proyectoClaveServicio = keys.map((k) => keyProjectRef(k.key)).find(Boolean) ?? null;
  const avisos: string[] = [];
  if (proyectoClavePublica && proyectoUrl && proyectoClavePublica !== proyectoUrl) avisos.push("La clave pública pertenece a OTRO proyecto de Supabase distinto al de la dirección.");
  if (proyectoClaveServicio && proyectoUrl && proyectoClaveServicio !== proyectoUrl) avisos.push("La clave de servicio pertenece a OTRO proyecto de Supabase distinto al de la dirección.");
  if (claveServicio === "ok" && values_invalid(porVariable)) avisos.push("Una de las claves de servicio no es válida, pero la otra sí: la tienda usará la válida automáticamente.");
  if (claveServicio === "invalida" && !avisos.length) avisos.push("Supabase rechazó la clave de servicio: cópiela de nuevo completa (Project Settings › API Keys) y vuelva a desplegar.");

  return NextResponse.json(
    {
      modo: isDemoMode ? "demostracion" : "supabase",
      forzado_demo: process.env.ICON_DEMO_MODE === "true",
      variables_direccion: present(SUPABASE_URL_VARS),
      variables_clave: present(SUPABASE_KEY_VARS),
      variables_clave_servicio: present(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]),
      site_url: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      proyecto: { direccion: proyectoUrl, clave_publica: proyectoClavePublica, clave_servicio: proyectoClaveServicio },
      conexion,
      clave_servicio: claveServicio,
      clave_servicio_por_variable: porVariable,
      ...(detalle ? { detalle } : {}),
      ...(avisos.length ? { avisos } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
