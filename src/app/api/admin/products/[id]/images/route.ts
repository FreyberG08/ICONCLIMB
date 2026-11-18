import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminRepo, DomainError } from "@/lib/data";
import { IMAGE_TYPES, jsonError, MAX_IMAGE_BYTES, sniffType } from "../../../_upload";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DomainError("Producto inválido", "not_found");
    const repo = await getAdminRepo("catalog.edit");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new DomainError("No se recibió ninguna fotografía");
    if (file.size > MAX_IMAGE_BYTES) throw new DomainError("La fotografía supera 8 MB");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffType(bytes);
    if (!type || !IMAGE_TYPES.includes(type)) throw new DomainError("Formato no admitido. Use JPG, PNG, WebP o AVIF.");
    const width = Number(form.get("width")) || null;
    const height = Number(form.get("height")) || null;
    const img = await repo.uploadImage(id, { name: file.name || "foto.jpg", type, bytes, width, height });
    revalidatePath("/", "layout");
    return NextResponse.json({ image: img });
  } catch (e) {
    return jsonError(e);
  }
}
