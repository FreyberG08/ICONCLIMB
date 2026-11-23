"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { Camera, ChevronLeft, ChevronRight, GripVertical, ImagePlus, Star, Trash2 } from "lucide-react";
import type { ProductImage } from "@/lib/types";
import { uploadProductImage } from "@/lib/client/compress-image";
import { deleteImageAction, reorderImagesAction, setPrimaryImageAction, updateImageAltAction } from "@/app/admin/actions";
import { cn } from "@/lib/cn";
import { Alert } from "@/components/ui/misc";
import { Spinner } from "@/components/ui/button";
import { safeCall } from "@/lib/client/safe-call";

export interface PendingImage {
  key: string;
  file: File;
  preview: string;
}

/** Selector de archivos con opción de cámara en teléfonos. */
function Pickers({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
        if (files.length) onFiles(files);
      }}
      className={cn("rounded-lg border-2 border-dashed p-6 text-center transition-colors", drag ? "border-climb-500 bg-climb-50" : "border-steel-200 bg-steel-25")}
    >
      <ImagePlus className="mx-auto size-6 text-steel-400" />
      <p className="mt-2 text-sm text-steel-600">Arrastre fotografías aquí o</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button type="button" disabled={disabled} onClick={() => gallery.current?.click()} className="inline-flex h-9 items-center gap-2 rounded-md border border-steel-200 bg-white px-3 text-[13px] font-medium text-ink hover:bg-steel-50 disabled:opacity-50">
          <ImagePlus className="size-4" /> Elegir archivos
        </button>
        <button type="button" disabled={disabled} onClick={() => camera.current?.click()} className="inline-flex h-9 items-center gap-2 rounded-md border border-steel-200 bg-white px-3 text-[13px] font-medium text-ink hover:bg-steel-50 disabled:opacity-50 md:hidden">
          <Camera className="size-4" /> Tomar foto
        </button>
      </div>
      <p className="mt-3 text-[12px] text-steel-500">JPG, PNG, WebP · se optimizan automáticamente antes de subir (máx. 2400 px).</p>
      <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
    </div>
  );
}

/** Fotografías en cola para un producto que aún no se ha guardado. */
export function PendingImages({ items, onChange }: { items: PendingImage[]; onChange: (items: PendingImage[]) => void }) {
  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {items.map((it, i) => (
            <li key={it.key} className="group relative aspect-square overflow-hidden rounded-md border border-steel-150 bg-steel-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.preview} alt="" className="h-full w-full object-contain" />
              {i === 0 && <span className="absolute top-1.5 left-1.5 rounded bg-ink px-1.5 py-0.5 text-[10px] font-medium text-white">Principal</span>}
              <button type="button" onClick={() => { URL.revokeObjectURL(it.preview); onChange(items.filter((x) => x.key !== it.key)); }} className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded bg-white/90 text-err-600 shadow" aria-label="Quitar">
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Pickers onFiles={(files) => onChange([...items, ...files.map((file) => ({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }))])} />
      {items.length > 0 && <p className="text-[12.5px] text-steel-500">Se subirán al guardar el producto. La primera será la fotografía principal.</p>}
    </div>
  );
}

/** Galería de un producto existente: subir, ordenar, principal, texto alternativo, eliminar. */
export function ImageManager({ productId, initial }: { productId: string; initial: ProductImage[] }) {
  const [images, setImages] = useState<ProductImage[]>(() => [...initial].sort((a, b) => a.position - b.position));
  const [uploading, setUploading] = useState<{ name: string; done: boolean; error?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [, start] = useTransition();

  async function upload(files: File[]) {
    setError(null);
    setUploading(files.map((f) => ({ name: f.name, done: false })));
    for (let i = 0; i < files.length; i++) {
      try {
        const img = (await uploadProductImage(productId, files[i])) as ProductImage;
        setImages((list) => [...list, img]);
        setUploading((u) => u.map((x, j) => (j === i ? { ...x, done: true } : x)));
      } catch (e) {
        setUploading((u) => u.map((x, j) => (j === i ? { ...x, done: true, error: (e as Error).message } : x)));
      }
    }
    setTimeout(() => setUploading((u) => u.filter((x) => x.error)), 1500);
  }

  function persistOrder(next: ProductImage[]) {
    setImages(next);
    start(async () => {
      const res = await safeCall(() => reorderImagesAction(productId, next.map((i) => i.id)));
      if (!res.ok) setError(res.error);
    });
  }

  function move(id: string, delta: number) {
    const idx = images.findIndex((i) => i.id === id);
    const to = idx + delta;
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [it] = next.splice(idx, 1);
    next.splice(to, 0, it);
    persistOrder(next);
  }

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {images.map((img, idx) => (
            <li
              key={img.id}
              draggable
              onDragStart={() => setDragId(img.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!dragId || dragId === img.id) return;
                const next = [...images];
                const from = next.findIndex((i) => i.id === dragId);
                const [it] = next.splice(from, 1);
                next.splice(idx, 0, it);
                setDragId(null);
                persistOrder(next);
              }}
              className={cn("overflow-hidden rounded-lg border bg-white transition-shadow", img.isPrimary ? "border-climb-500 ring-2 ring-climb-100" : "border-steel-150", dragId === img.id && "opacity-50")}
            >
              <div className="relative aspect-square bg-steel-50">
                <Image src={img.url} alt={img.alt ?? ""} fill sizes="200px" className="object-contain p-1" />
                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded bg-white/90 px-1 py-0.5 text-steel-500 shadow-sm"><GripVertical className="size-3.5" /><span className="font-mono text-[10px]">{idx + 1}</span></span>
                {img.isPrimary && <span className="absolute top-1.5 right-1.5 rounded bg-climb-600 px-1.5 py-0.5 text-[10px] font-medium text-white">Principal</span>}
              </div>
              <div className="space-y-2 p-2">
                <input
                  defaultValue={img.alt ?? ""}
                  placeholder="Texto alternativo"
                  aria-label="Texto alternativo de la fotografía"
                  onBlur={(e) => {
                    const alt = e.target.value;
                    if (alt !== (img.alt ?? "")) start(async () => { await safeCall(() => updateImageAltAction(img.id, alt)); });
                  }}
                  className="w-full rounded border border-steel-200 px-2 py-1 text-[12px] focus:border-climb-500 focus:outline-none"
                />
                <div className="flex items-center justify-between">
                  <div className="flex">
                    <button type="button" onClick={() => move(img.id, -1)} disabled={idx === 0} className="grid size-7 place-items-center rounded text-steel-500 hover:bg-steel-100 disabled:opacity-30" aria-label="Mover a la izquierda"><ChevronLeft className="size-4" /></button>
                    <button type="button" onClick={() => move(img.id, 1)} disabled={idx === images.length - 1} className="grid size-7 place-items-center rounded text-steel-500 hover:bg-steel-100 disabled:opacity-30" aria-label="Mover a la derecha"><ChevronRight className="size-4" /></button>
                  </div>
                  <div className="flex">
                    <button
                      type="button"
                      disabled={img.isPrimary}
                      onClick={() => {
                        setImages((l) => l.map((x) => ({ ...x, isPrimary: x.id === img.id })));
                        start(async () => { const r = await safeCall(() => setPrimaryImageAction(productId, img.id)); if (!r.ok) setError(r.error); });
                      }}
                      className="grid size-7 place-items-center rounded text-steel-500 hover:bg-steel-100 hover:text-climb-600 disabled:text-climb-600"
                      aria-label="Definir como principal"
                      title="Definir como principal"
                    >
                      <Star className={cn("size-4", img.isPrimary && "fill-current")} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm("¿Eliminar esta fotografía? Esta acción no se puede deshacer.")) return;
                        const rest = images.filter((x) => x.id !== img.id);
                        if (img.isPrimary && rest[0]) rest[0] = { ...rest[0], isPrimary: true };
                        setImages(rest);
                        start(async () => { const r = await safeCall(() => deleteImageAction(productId, img.id)); if (!r.ok) setError(r.error); });
                      }}
                      className="grid size-7 place-items-center rounded text-steel-500 hover:bg-err-50 hover:text-err-600"
                      aria-label="Eliminar fotografía"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {uploading.length > 0 && (
        <ul className="space-y-1">
          {uploading.map((u, i) => (
            <li key={i} className="flex items-center gap-2 text-[12.5px] text-steel-600">
              {!u.done ? <Spinner className="size-3.5" /> : u.error ? <span className="text-err-600">✕</span> : <span className="text-ok-600">✓</span>}
              <span className="truncate">{u.name}</span>
              {u.error && <span className="text-err-600">— {u.error}</span>}
            </li>
          ))}
        </ul>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <Pickers onFiles={upload} disabled={uploading.some((u) => !u.done)} />
      {images.length > 1 && <p className="text-[12px] text-steel-500">Arrastre para ordenar o use las flechas. La estrella define la fotografía principal.</p>}
    </div>
  );
}
