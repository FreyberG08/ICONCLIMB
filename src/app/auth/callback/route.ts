import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";

// Retorno de enlaces de Supabase Auth (restablecer contraseña / invitación).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = next && next.startsWith("/admin") ? next : "/admin";
  if (!isDemoMode && code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/admin/login?error=link", url));
  }
  return NextResponse.redirect(new URL(safeNext, url));
}
