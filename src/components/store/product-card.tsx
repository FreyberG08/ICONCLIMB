import Link from "next/link";
import type { CatalogProduct } from "@/lib/types";
import { availabilityLabel } from "@/lib/labels";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "./product-image";

export function ProductCard({ product, priority }: { product: CatalogProduct; priority?: boolean }) {
  const avail = availabilityLabel(product.availability, product.saleMode);
  return (
    <article data-tilt data-cursor="Ver ficha" className="card-sheen group relative flex flex-col rounded-xl border border-steel-150 bg-white p-3 transition-[border-color,box-shadow] duration-300 ease-[var(--ease-out-quint)] hover:border-climb-200 hover:shadow-[0_30px_60px_-30px_rgb(10_33_73/0.35)]">
      <span className="card-glare pointer-events-none absolute inset-0 z-10 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
      <ProductImage src={product.imageUrl} alt={product.name} sku={product.sku} categorySlug={product.categorySlug} priority={priority} />
      <div className="flex flex-1 flex-col px-1 pt-4 pb-1">
        <div className="flex items-center justify-between gap-2">
          <span className="sku truncate">{product.sku}</span>
          <Badge tone={avail.tone} dot>{avail.label}</Badge>
        </div>
        <h3 className="mt-2 line-clamp-2 text-[15px] leading-snug font-medium text-ink">
          <Link href={`/producto/${product.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 truncate text-[12.5px] text-steel-500">
          {[product.brandName, product.model, product.reference && `Ref. ${product.reference}`].filter(Boolean).join(" · ") || product.categoryName}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          {product.saleMode === "direct" && product.price != null ? (
            <p className="text-[17px] font-semibold tracking-tight text-ink tabular-nums">{formatMoney(product.price, product.currency)}</p>
          ) : (
            <p className="text-[13px] font-medium text-climb-700">Precio bajo cotización</p>
          )}
          <span className="font-mono text-[10px] tracking-wider text-steel-400 uppercase">
            {product.saleMode === "direct" ? "Compra directa" : "Cotizar"}
          </span>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: CatalogProduct[]; priorityCount?: number }) {
  return (
    <div data-stagger className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
