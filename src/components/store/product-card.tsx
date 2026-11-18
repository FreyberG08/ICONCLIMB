import Link from "next/link";
import type { CatalogProduct } from "@/lib/types";
import { availabilityLabel } from "@/lib/labels";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "./product-image";

export function ProductCard({ product, priority }: { product: CatalogProduct; priority?: boolean }) {
  const avail = availabilityLabel(product.availability, product.saleMode);
  return (
    <article className="group relative flex flex-col rounded-lg border border-steel-150 bg-white p-3 transition-[border-color,box-shadow,transform] duration-300 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 hover:border-steel-200 hover:shadow-[var(--shadow-raised)]">
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
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
