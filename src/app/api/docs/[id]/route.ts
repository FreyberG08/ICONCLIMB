import { NextResponse } from "next/server";
import { getPublicRepo } from "@/lib/data";

// Descarga de documentación técnica autorizada (solo documentos públicos de productos publicados).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("No encontrado", { status: 404 });
  const url = await getPublicRepo().getPublicDocumentUrl(id);
  if (!url) return new NextResponse("Documento no disponible", { status: 404 });
  return NextResponse.redirect(new URL(url, req.url), { status: 302 });
}
