import Image from "next/image";
import { CategoryIcon } from "./category-icon";
import { cn } from "@/lib/cn";

/**
 * Imagen de producto con marcador técnico cuando aún no hay fotografía.
 * El marcador es intencional: el catálogo se construye progresivamente.
 */
export function ProductImage({
  src,
  alt,
  sku,
  categorySlug,
  sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw",
  priority,
  className,
  rounded = true,
}: {
  src: string | null;
  alt: string;
  sku: string;
  categorySlug?: string | null;
  sizes?: string;
  priority?: boolean;
  className?: string;
  rounded?: boolean;
}) {
  return (
    <div className={cn("relative aspect-square overflow-hidden bg-steel-50", rounded && "rounded-md", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-contain p-[6%] mix-blend-multiply transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:scale-[1.035]"
        />
      ) : (
        <div className="blueprint-fine absolute inset-0 flex flex-col items-center justify-center gap-3 text-steel-300">
          <div className="absolute inset-[10%] rounded border border-dashed border-steel-200" aria-hidden="true" />
          <CategoryIcon slug={categorySlug} className="size-[22%] min-h-8 min-w-8" />
          <span className="relative font-mono text-[10px] tracking-[0.16em] text-steel-400 uppercase">Fotografía pendiente</span>
          <span className="absolute bottom-[4%] left-[4%] font-mono text-[9px] tracking-wider text-steel-300">{sku}</span>
        </div>
      )}
    </div>
  );
}
