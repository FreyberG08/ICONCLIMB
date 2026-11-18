import fs from "node:fs/promises";
import path from "node:path";
import { isDemoMode } from "@/lib/config";
import { DEMO_UPLOADS } from "@/lib/data/demo/store";
import { db } from "@/lib/data/demo/store";
import { getSession } from "@/lib/auth/session";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", pdf: "application/pdf",
  zip: "application/zip", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

// Archivos del MODO DEMOSTRACIÓN (en producción se sirven desde Supabase Storage).
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!isDemoMode) return new Response("No encontrado", { status: 404 });
  const { path: parts } = await params;
  const rel = parts.map(decodeURIComponent).join("/");
  const full = path.join(DEMO_UPLOADS, rel);
  if (!full.startsWith(DEMO_UPLOADS + path.sep)) return new Response("No encontrado", { status: 404 });

  // Documentos privados: solo personal autenticado o documentos públicos de productos publicados.
  const doc = db().documents.find((d) => d.storagePath === rel);
  if (doc) {
    const product = db().products.find((p) => p.id === doc.productId);
    const isPublic = doc.isPublic && product?.status === "published";
    if (!isPublic && (await getSession()).status !== "active") return new Response("No autorizado", { status: 403 });
  }
  try {
    const data = await fs.readFile(full);
    const ext = rel.split(".").pop()?.toLowerCase() ?? "";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": doc ? "private, no-store" : "public, max-age=31536000, immutable",
        ...(doc ? { "Content-Disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"` } : {}),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
