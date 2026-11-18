import { NextResponse } from "next/server";
import { getAdminRepo } from "@/lib/data";
import { jsonError } from "../../_upload";

// Descarga interna (personal): cualquier documento, público o no.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const repo = await getAdminRepo("catalog.view");
    const url = await repo.getDocumentUrl(id);
    if (!url) return new NextResponse("No encontrado", { status: 404 });
    return NextResponse.redirect(new URL(url, req.url));
  } catch (e) {
    return jsonError(e);
  }
}
