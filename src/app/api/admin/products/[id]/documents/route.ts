import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminRepo, DomainError } from "@/lib/data";
import { jsonError, MAX_DOC_BYTES, sniffType } from "../../../_upload";

const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "application/zip"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DomainError("Producto inválido", "not_found");
    const repo = await getAdminRepo("catalog.edit");
    const form = await req.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim().slice(0, 160);
    const isPublic = form.get("isPublic") === "true";
    if (!(file instanceof File)) throw new DomainError("No se recibió ningún archivo");
    if (file.size > MAX_DOC_BYTES) throw new DomainError("El documento supera 4 MB. Comprímalo o divídalo.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let type = sniffType(bytes);
    // DOCX/XLSX son ZIP: se conserva el tipo declarado si la firma es ZIP.
    if (type === "application/zip" && /officedocument/.test(file.type)) type = file.type;
    if (!type || !(ALLOWED.includes(type) || /officedocument/.test(type))) throw new DomainError("Formato no admitido. Use PDF, imagen, ZIP, DOCX o XLSX.");
    const doc = await repo.uploadDocument(id, { name: file.name, type, bytes }, title || file.name, isPublic);
    revalidatePath("/", "layout");
    return NextResponse.json({ document: doc });
  } catch (e) {
    return jsonError(e);
  }
}
