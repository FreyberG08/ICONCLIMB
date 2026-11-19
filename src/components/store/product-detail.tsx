import Link from "next/link";
import { BadgeCheck, Download, FileText, HelpCircle } from "lucide-react";
import type { CatalogProductDetail } from "@/lib/types";
import { formatBytes } from "@/lib/format";
import { Gallery } from "./gallery";
import { BuyBox } from "./buy-box";
import { ProductGrid } from "./product-card";

export function ProductDetailView({ product, preview = false }: { product: CatalogProductDetail; preview?: boolean }) {
  const identity = [
    { label: "SKU", value: product.sku, mono: true },
    { label: "Fabricante", value: product.brandName },
    { label: "Modelo", value: product.model },
    { label: "Referencia original", value: product.reference, mono: true },
    { label: "Códigos alternativos", value: product.altCodes.length ? product.altCodes.join(", ") : null, mono: true },
    { label: "Categoría", value: [product.categoryName, product.subcategoryName].filter(Boolean).join(" › ") || null },
  ].filter((r) => r.value);

  return (
    <div className="container-x py-8 lg:py-12">
      <nav aria-label="Ruta" className="font-mono text-[11px] tracking-wide text-steel-500">
        <Link href="/" className="hover:text-ink">INICIO</Link> <span className="mx-1.5 text-steel-300">/</span>
        <Link href="/catalogo" className="hover:text-ink">CATÁLOGO</Link>
        {product.categorySlug && (
          <>
            <span className="mx-1.5 text-steel-300">/</span>
            <Link href={`/catalogo?categoria=${product.categorySlug}`} className="hover:text-ink">{product.categoryName?.toUpperCase()}</Link>
          </>
        )}
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <Gallery images={product.images} name={product.name} sku={product.sku} categorySlug={product.categorySlug} />
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <p className="sku">SKU {product.sku}{product.brandName && <> · {product.brandName}</>}</p>
            <h1 data-split="words" className="mt-2 text-[28px] leading-tight font-semibold sm:text-[34px]">{product.name}</h1>
            {product.shortDescription && <p className="mt-3 text-[15.5px] leading-relaxed text-steel-600">{product.shortDescription}</p>}
            <div className="mt-6">
              <BuyBox product={product} preview={preview} />
            </div>
            <dl className="mt-6 divide-y divide-steel-100 rounded-xl border border-steel-150">
              {identity.map((r) => (
                <div key={r.label} className="grid grid-cols-[150px_1fr] gap-3 px-4 py-2.5 text-[13.5px]">
                  <dt className="text-steel-500">{r.label}</dt>
                  <dd className={r.mono ? "font-mono text-[12.5px] text-ink" : "text-ink"}>{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-10 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-7">
          {product.description && (
            <section aria-labelledby="desc">
              <h2 id="desc" className="text-xl font-semibold">Descripción</h2>
              <div className="mt-4 space-y-3 text-[15px] leading-relaxed whitespace-pre-line text-steel-700">{product.description}</div>
            </section>
          )}

          <section aria-labelledby="specs">
            <h2 id="specs" className="text-xl font-semibold">Características técnicas</h2>
            {product.specs.length ? (
              <table className="mt-4 w-full overflow-hidden rounded-lg border border-steel-150 text-[14px]">
                <tbody>
                  {product.specs.map((s, i) => (
                    <tr key={i} className="border-b border-steel-100 last:border-0 odd:bg-steel-25">
                      <th scope="row" className="w-2/5 px-4 py-3 text-left font-normal text-steel-500">{s.label}</th>
                      <td className="px-4 py-3 text-ink">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-3 text-sm text-steel-500">La ficha técnica detallada está en preparación. Consulte con un asesor para obtener la información que necesita.</p>
            )}
          </section>
        </div>

        <div className="space-y-12 lg:col-span-5">
          <section aria-labelledby="compat">
            <h2 id="compat" className="text-xl font-semibold">Compatibilidades verificadas</h2>
            {product.compatibilities.length ? (
              <ul className="mt-4 divide-y divide-steel-100 rounded-lg border border-steel-150">
                {product.compatibilities.map((c) => (
                  <li key={c.id} className="flex gap-3 px-4 py-3">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-ok-600" aria-hidden="true" />
                    <div>
                      <p className="text-[14px] font-medium text-ink">{c.brand} · {c.model}</p>
                      {c.notes && <p className="mt-0.5 text-[13px] text-steel-500">{c.notes}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 flex gap-3 rounded-lg border border-dashed border-steel-200 bg-steel-25 p-4 text-[13.5px] text-steel-600">
                <HelpCircle className="mt-0.5 size-4 shrink-0 text-climb-600" aria-hidden="true" />
                <p>Aún no hay compatibilidades verificadas publicadas para este repuesto. Indíquenos la marca y el modelo de su equipo y nuestro equipo técnico lo confirmará.</p>
              </div>
            )}
          </section>

          {product.documents.length > 0 && (
            <section aria-labelledby="docs">
              <h2 id="docs" className="text-xl font-semibold">Documentación técnica</h2>
              <ul className="mt-4 space-y-2">
                {product.documents.map((d) => (
                  <li key={d.id}>
                    <a href={preview ? "#" : `/api/docs/${d.id}`} className="group flex items-center gap-3 rounded-lg border border-steel-150 px-4 py-3 transition-colors hover:border-steel-300 hover:bg-steel-25">
                      <FileText className="size-5 shrink-0 text-climb-600" strokeWidth={1.6} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-ink">{d.title}</span>
                        <span className="block font-mono text-[11px] text-steel-400">{d.fileName} {d.sizeBytes ? `· ${formatBytes(d.sizeBytes)}` : ""}</span>
                      </span>
                      <Download className="size-4 text-steel-400 group-hover:text-ink" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {product.related.length > 0 && (
        <section className="mt-20 border-t border-steel-150 pt-12" aria-labelledby="rel">
          <h2 id="rel" className="text-2xl font-semibold">Productos relacionados</h2>
          <div className="mt-8">
            <ProductGrid products={product.related} />
          </div>
        </section>
      )}
    </div>
  );
}
