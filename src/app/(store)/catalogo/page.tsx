import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, SearchX, SlidersHorizontal, X } from "lucide-react";
import { getPublicRepo } from "@/lib/data";
import type { CatalogQuery } from "@/lib/types";
import { ProductGrid } from "@/components/store/product-card";
import { CatalogFilters, SortSelect, type FilterState } from "@/components/store/catalog-filters";
import { SearchBox } from "@/components/store/search-box";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";

type SP = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}
function many(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);
}
function num(v: string | undefined) {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const q = one(sp.q);
  const cat = one(sp.categoria);
  let title = "Catálogo de repuestos";
  if (cat) {
    const c = (await getPublicRepo().listCategories()).find((x) => x.slug === cat);
    if (c) title = c.name;
  }
  if (q) title = `Resultados para “${q}”`;
  return {
    title,
    description: "Busque repuestos para ascensores por nombre, SKU, código, marca o referencia original.",
    alternates: { canonical: cat ? `/catalogo?categoria=${cat}` : "/catalogo" },
    robots: q ? { index: false, follow: true } : undefined,
  };
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const state: FilterState = {
    q: one(sp.q)?.slice(0, 80),
    categoria: one(sp.categoria),
    marca: many(sp.marca),
    disponibilidad: one(sp.disponibilidad),
    modo: one(sp.modo),
    min: one(sp.min),
    max: one(sp.max),
    orden: one(sp.orden),
  };
  const page = Math.max(1, Math.floor(num(one(sp.pagina)) ?? 1));
  const query: CatalogQuery = {
    q: state.q,
    category: state.categoria,
    brand: state.marca,
    availability: state.disponibilidad === "available" || state.disponibilidad === "unavailable" ? state.disponibilidad : undefined,
    mode: state.modo === "direct" || state.modo === "quote" ? state.modo : undefined,
    minPrice: num(state.min),
    maxPrice: num(state.max),
    sort: (["relevance", "newest", "name", "price_asc", "price_desc"] as const).find((s) => s === state.orden) ?? "relevance",
    page,
    pageSize: 12,
  };

  const repo = getPublicRepo();
  const [result, categories, brands] = await Promise.all([repo.searchCatalog(query), repo.listCategories(), repo.listBrands()]);
  const category = categories.find((c) => c.slug === state.categoria);

  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.categoria) params.set("categoria", state.categoria);
  state.marca.forEach((m) => params.append("marca", m));
  if (state.disponibilidad) params.set("disponibilidad", state.disponibilidad);
  if (state.modo) params.set("modo", state.modo);
  if (state.min) params.set("min", state.min);
  if (state.max) params.set("max", state.max);
  if (state.orden) params.set("orden", state.orden);

  const hrefWithout = (key: string, value?: string) => {
    const p = new URLSearchParams(params);
    if (value) {
      const rest = p.getAll(key).filter((v) => v !== value);
      p.delete(key);
      rest.forEach((v) => p.append(key, v));
    } else p.delete(key);
    return `/catalogo${p.size ? `?${p}` : ""}`;
  };

  const chips: { label: string; href: string }[] = [];
  if (state.q) chips.push({ label: `“${state.q}”`, href: hrefWithout("q") });
  if (category) chips.push({ label: category.name, href: hrefWithout("categoria") });
  state.marca.forEach((m) => chips.push({ label: brands.find((b) => b.slug === m)?.name ?? m, href: hrefWithout("marca", m) }));
  if (query.mode) chips.push({ label: query.mode === "direct" ? "Compra directa" : "Cotización", href: hrefWithout("modo") });
  if (query.availability) chips.push({ label: query.availability === "available" ? "Disponible" : "Agotado / bajo pedido", href: hrefWithout("disponibilidad") });
  if (query.minPrice != null || query.maxPrice != null) {
    const p = new URLSearchParams(params);
    p.delete("min");
    p.delete("max");
    chips.push({ label: `Precio ${state.min ?? "0"}–${state.max ?? "∞"}`, href: `/catalogo${p.size ? `?${p}` : ""}` });
  }

  const pageHref = (n: number) => {
    const p = new URLSearchParams(params);
    if (n > 1) p.set("pagina", String(n));
    return `/catalogo${p.size ? `?${p}` : ""}`;
  };

  const top = categories.filter((c) => !c.parentId);

  return (
    <div className="container-x py-8 lg:py-12">
      <nav aria-label="Ruta" className="font-mono text-[11px] tracking-wide text-steel-500">
        <Link href="/" className="hover:text-ink">INICIO</Link> <span className="mx-1.5 text-steel-300">/</span>
        <Link href="/catalogo" className="hover:text-ink">CATÁLOGO</Link>
        {category && (<><span className="mx-1.5 text-steel-300">/</span><span className="text-ink">{category.name.toUpperCase()}</span></>)}
      </nav>

      <header className="mt-4 flex flex-col gap-6 border-b border-steel-150 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-[30px] leading-tight font-semibold sm:text-[38px]">
            {state.q ? <>Resultados para “{state.q}”</> : category ? category.name : "Catálogo de repuestos"}
          </h1>
          <p className="mt-2 text-[15px] text-steel-600">
            {category?.description ?? "Busque por nombre, código SKU, referencia original, marca o modelo."}
          </p>
        </div>
        <div className="hidden w-full md:block lg:max-w-md">
          <SearchBox key={state.q ?? ""} defaultValue={state.q ?? ""} />
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-10">
        <aside aria-label="Filtros">
          <details className="group rounded-lg border border-steel-150 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-ink">
              <span className="flex items-center gap-2"><SlidersHorizontal className="size-4" /> Filtros {chips.length > 0 && <span className="rounded-full bg-climb-600 px-1.5 font-mono text-[10px] text-white">{chips.length}</span>}</span>
              <span className="text-steel-400 group-open:rotate-180">⌄</span>
            </summary>
            <div className="border-t border-steel-150 p-4">
              <CatalogFilters state={state} categories={top} brands={brands} />
            </div>
          </details>
          <div className="sticky top-24 hidden lg:block">
            <CatalogFilters state={state} categories={top} brands={brands} />
          </div>
        </aside>

        <section aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-steel-600">
              <span className="font-semibold text-ink tabular-nums">{result.total}</span> {result.total === 1 ? "repuesto" : "repuestos"}
            </p>
            <SortSelect value={query.sort ?? "relevance"} params={params.toString()} />
          </div>

          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <Link key={c.label + c.href} href={c.href} className="inline-flex items-center gap-1.5 rounded-full border border-steel-200 bg-white py-1 pr-2 pl-3 text-[12.5px] text-steel-700 hover:border-steel-300" aria-label={`Quitar filtro ${c.label}`}>
                  {c.label} <X className="size-3 text-steel-400" />
                </Link>
              ))}
              <Link href="/catalogo" className="text-[12.5px] font-medium text-climb-700 hover:underline">Limpiar todo</Link>
            </div>
          )}

          <div className="mt-6">
            {result.items.length ? (
              <ProductGrid products={result.items} priorityCount={4} />
            ) : (
              <EmptyState
                icon={<SearchX className="size-5" />}
                title="No encontramos repuestos con esos criterios"
                description={state.q ? "Verifique el código o pruebe con la referencia original, la marca o una descripción más general. También puede solicitarnos la pieza directamente." : "Pruebe quitando algunos filtros o explore otra categoría."}
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    {chips.length > 0 && <LinkButton href="/catalogo" variant="outline">Ver todo el catálogo</LinkButton>}
                    <LinkButton href={`/cotizacion${state.q ? `?pieza=${encodeURIComponent(state.q)}` : ""}`}><ClipboardList className="size-4" /> Solicitar esta pieza</LinkButton>
                  </div>
                }
              />
            )}
          </div>

          <div className="mt-10">
            <Pagination page={result.page} total={result.total} pageSize={result.pageSize} hrefFor={pageHref} />
          </div>
        </section>
      </div>
    </div>
  );
}
