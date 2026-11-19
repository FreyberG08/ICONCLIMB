"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductImage as Img } from "@/lib/types";
import { ProductImage } from "./product-image";
import { cn } from "@/lib/cn";

export function Gallery({ images, name, sku, categorySlug }: { images: Img[]; name: string; sku: string; categorySlug: string | null }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  if (!images.length) {
    return (
      <div data-gallery-main>
        <ProductImage src={null} alt={name} sku={sku} categorySlug={categorySlug} className="rounded-xl border border-steel-150" rounded={false} />
      </div>
    );
  }
  const current = images[Math.min(i, images.length - 1)];
  const go = (d: number) => setI((v) => (v + d + images.length) % images.length);
  return (
    <div className="space-y-3">
      <div
        data-gallery-main
        data-cursor={zoom ? undefined : "Zoom"}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onPointerLeave={() => setZoom(null)}
        className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-xl border border-steel-150 bg-steel-50"
        tabIndex={0}
        role="region"
        aria-roledescription="galería"
        aria-label={`Fotografía ${i + 1} de ${images.length}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
      >
        <Image
          key={current.id}
          src={current.url}
          alt={current.alt || name}
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          style={zoom ? { transform: "scale(2.2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          className="object-contain p-[5%] mix-blend-multiply transition-transform duration-300 ease-out"
        />
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow ring-1 ring-steel-150 transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label="Fotografía anterior"><ChevronLeft className="size-4" /></button>
            <button type="button" onClick={() => go(1)} className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow ring-1 ring-steel-150 transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label="Fotografía siguiente"><ChevronRight className="size-4" /></button>
            <span className="absolute right-3 bottom-3 rounded bg-white/90 px-2 py-0.5 font-mono text-[11px] text-steel-600 ring-1 ring-steel-150">{i + 1} / {images.length}</span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setI(idx)}
              aria-label={`Ver fotografía ${idx + 1}`}
              aria-current={idx === i}
              className={cn("relative aspect-square overflow-hidden rounded-md border bg-steel-50 transition-[border-color,box-shadow]", idx === i ? "border-climb-500 shadow-[var(--shadow-focus)]" : "border-steel-150 hover:border-steel-300")}
            >
              <Image src={img.url} alt="" fill sizes="96px" className="object-contain p-1 mix-blend-multiply" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
