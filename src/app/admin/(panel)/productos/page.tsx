import Link from "next/link";
import Image from "next/image";
import { ImageOff, PackagePlus, Search } from "lucide-react";
import { getAdminRepo } from "@/lib/data";
import { can } from "@/lib/permissions";
import { formatDate, formatMoney } from "@/lib/format";
import { PRODUCT_STATUS, PRODUCT_STATUS_ORDER } from "@/lib/labels";
import type { ProductStatus } from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { ProductStatusBadge, StockCell } from "@/components/admin/status-badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export const metadata = { title: "Productos" };

type SP = Promise<Record<string, string | undefined>>;

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const repo = await getAdminRepo("catalog.view");
  const status = (PRODUCT_STATUS_ORDER as string[]).includes(sp.estado ?? "") ? (sp.estado as ProductStatus) : sp.estado === "all" ? "all" : undefined;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const [result, categories] = await Promise.all([
    repo.listProducts({
      q: sp.q,
      status,
      categoryId: sp.categoria || undefined,
      saleMode: sp.modo === "direct" || sp.modo === "quote" ? sp.modo : undefined,
      stock: sp.stock === "low" || sp.stock === "out" ? sp.stock : undefined,
      page,
      pageSize: 25,
    }),
    repo.listAllCategories(),
  ]);

  const base = new URLSearchParams();
  for (const k of ["q", "estado", "categoria", "modo", "stock"]) if (sp[k]) base.set(k, sp[k]!);
  const tabHref = (s?: string) => {
    const p = new URLSearchParams(base);
    p.delete("pagina");
    if (s) p.set("estado", s);
    else p.delete("estado");
    return `/admin/productos${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Productos"
        description="Cree, edite y publique repuestos. Los productos nuevos siempre pasan por revisión antes de publicarse."
        actions={can(repo.user.role, "catalog.edit") && <LinkButton href="/admin/productos/nuevo"><PackagePlus className="size-4" /> Nuevo producto</LinkButton>}
      />

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-steel-200">
        {[{ key: undefined, label: "Activos" }, ...PRODUCT_STATUS_ORDER.map((s) => ({ key: s, label: PRODUCT_STATUS[s].label })), { key: "all", label: "Todos" }].map((t) => {
          const active = (status ?? undefined) === t.key || (!status && !t.key);
          return (
            <Link key={t.label} href={tabHref(t.key)} className={cn("-mb-px border-b-2 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors", active ? "border-climb-600 text-ink" : "border-transparent text-steel-500 hover:text-ink")}>
              {t.label}
            </Link>
          );
        })}
      </div>

      <form className="mb-5 grid gap-3 sm:grid-cols-[1fr_200px_170px_170px_auto]" action="/admin/productos">
        {status && <input type="hidden" name="estado" value={status} />}
        <label className="relative">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-steel-400" />
          <input name="q" defaultValue={sp.q} placeholder="Nombre, SKU, referencia, marca…" className="field-input pl-9" />
        </label>
        <Select name="categoria" defaultValue={sp.categoria ?? ""} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select name="modo" defaultValue={sp.modo ?? ""} aria-label="Modalidad">
          <option value="">Toda modalidad</option>
          <option value="direct">Compra directa</option>
          <option value="quote">Cotización</option>
        </Select>
        <Select name="stock" defaultValue={sp.stock ?? ""} aria-label="Existencias">
          <option value="">Toda existencia</option>
          <option value="low">Inventario bajo</option>
          <option value="out">Agotados</option>
        </Select>
        <button className="h-10 rounded-md bg-ink px-4 text-sm font-medium text-white hover:bg-steel-800" type="submit">Filtrar</button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          icon={<PackagePlus className="size-5" />}
          title="No hay productos con estos criterios"
          description="Cree el primer producto o importe su catálogo desde un archivo CSV."
          action={
            <div className="flex gap-2">
              {can(repo.user.role, "catalog.edit") && <LinkButton href="/admin/productos/nuevo">Nuevo producto</LinkButton>}
              {can(repo.user.role, "data.import") && <LinkButton href="/admin/datos" variant="outline">Importar CSV</LinkButton>}
            </div>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-steel-150 bg-white">
          <table className="table-base min-w-[880px]">
            <thead>
              <tr>
                <th className="w-[44%]">Producto</th>
                <th>Categoría</th>
                <th>Modalidad</th>
                <th className="text-right">Precio</th>
                <th>Disp. / Físico</th>
                <th>Estado</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/productos/${p.id}`} className="flex items-center gap-3">
                      <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-md border border-steel-150 bg-steel-50">
                        {p.imageUrl ? <Image src={p.imageUrl} alt="" fill sizes="44px" className="object-contain p-0.5" /> : <ImageOff className="size-4 text-steel-300" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink hover:underline">{p.name}</span>
                        <span className="sku">{p.sku}{p.brandName && ` · ${p.brandName}`} · {p.imageCount} foto{p.imageCount === 1 ? "" : "s"}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="text-[13px] text-steel-600">{p.categoryName ?? <span className="text-warn-600">Sin categoría</span>}</td>
                  <td className="text-[13px] text-steel-600">{p.saleMode === "direct" ? "Directa" : "Cotización"}</td>
                  <td className="text-right font-mono text-[12.5px] tabular-nums">{p.price != null ? formatMoney(p.price, p.currency) : "—"}</td>
                  <td><StockCell onHand={p.onHand} reserved={p.reserved} minStock={p.minStock} /></td>
                  <td><ProductStatusBadge status={p.status} /></td>
                  <td className="text-[12.5px] whitespace-nowrap text-steel-500">{formatDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-[13px] text-steel-500">{result.total} productos</p>
        <Pagination page={result.page} total={result.total} pageSize={result.pageSize} hrefFor={(n) => { const p = new URLSearchParams(base); p.set("pagina", String(n)); return `/admin/productos?${p}`; }} />
      </div>
    </>
  );
}
