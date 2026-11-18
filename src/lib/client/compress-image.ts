"use client";

/**
 * Optimiza fotografías en el navegador antes de subirlas: corrige orientación,
 * limita a 2400 px y convierte a WebP (o JPEG si no hay soporte).
 * Así las fotos tomadas con el teléfono (5–12 MB) quedan en ~300–900 KB.
 */
export async function compressImage(file: File, maxSide = 2400, quality = 0.86): Promise<{ file: File; width: number; height: number }> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") throw new Error("El archivo no es una imagen compatible");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Formato que el navegador no puede decodificar (p. ej. HEIC en algunos navegadores):
    // se envía el original y el servidor valida el formato.
    return { file, width: 0, height: 0 };
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { file, width: bitmap.width, height: bitmap.height };
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality));
  let blob = await toBlob("image/webp");
  let ext = "webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob("image/jpeg");
    ext = "jpg";
  }
  if (!blob) return { file, width, height };
  // Si la versión optimizada no es más liviana, se conserva el original.
  if (blob.size >= file.size && scale === 1 && /image\/(jpeg|png|webp)/.test(file.type)) return { file, width, height };
  const name = file.name.replace(/\.[^.]+$/, "") || "foto";
  return { file: new File([blob], `${name}.${ext}`, { type: blob.type }), width, height };
}

export async function uploadProductImage(productId: string, original: File) {
  const { file, width, height } = await compressImage(original);
  const body = new FormData();
  body.append("file", file);
  if (width) body.append("width", String(width));
  if (height) body.append("height", String(height));
  const res = await fetch(`/api/admin/products/${productId}/images`, { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "No se pudo subir la fotografía");
  return data.image;
}
