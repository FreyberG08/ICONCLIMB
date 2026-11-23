import "server-only";
import { NextResponse } from "next/server";
import { DomainError } from "@/lib/data";

export function jsonError(e: unknown) {
  if (e instanceof DomainError) {
    const status = e.code === "forbidden" ? 403 : e.code === "not_found" ? 404 : e.code === "conflict" ? 409 : 400;
    return NextResponse.json({ error: e.message }, { status });
  }
  if (e && typeof e === "object" && "digest" in e) {
    return NextResponse.json({ error: "Sesión expirada. Vuelva a iniciar sesión." }, { status: 401 });
  }
  console.error("[AICON upload]", e);
  return NextResponse.json({ error: "No se pudo procesar el archivo" }, { status: 500 });
}

/** Verifica la firma real del archivo (no solo la extensión o el tipo declarado). */
export function sniffType(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 && b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x66) return "image/avif";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return "application/zip";
  return null;
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_DOC_BYTES = 4 * 1024 * 1024; // límite de cuerpo de funciones de Vercel ≈ 4,5 MB
