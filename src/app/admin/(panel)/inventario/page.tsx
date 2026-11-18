import Link from "next/link";
import { Download, PackagePlus, Search, Warehouse } from "lucide-react";
import { getAdminRepo } from "@/lib/data";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { ProductStatusBadge } from "@/components/admin/status-badge";
import { MovementButton } from "@/components/admin/movement-dialog";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

export const metadata = { title: "Inventario" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; stock?: string }> }) {
  const sp = await searchParams;
  const repo = await getAdminRepo("catalog.view");
  const stock = sp.stock === "low" || sp.stock === "out" ? sp.stock : undefined;
  const rows = await repo.listInventory({ q: sp.q, stock });
  const r = repo.user.role;
  const totals = rows.reduce((a, x) => ({ onHand: a.onHand + x.onHand, reserved: a.reserved + x.reserved }), { onHand: 0, reserved: 0 });
  const tab = (key?: string) => `/admin/inventario${key || sp.q ? `?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(key ? { stock: key } : {}) })}` : ""}`;

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Existencia física, unidades reservadas por pedidos y cantidad disponible. Cada cambio queda registrado como movimiento."
        actions={
          <>
            {can(r, "data.export") && <a href="/api/admin/export" className="inline-flex h-10 items-center gap-2 rounded-md border border-steel-200 bg-white px-4 text-sm font-medium text-ink hover:bg-steel-50"><Download className="size-4" /> Exportar CSV</a>}
            {(can(r, "inventory.manage") || can(r, "catalog.edit")) && <LinkButton href="/admin/inventario/ingreso"><PackagePlus className="size-4" /> Registrar ingreso</LinkButton>}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[["Unidades físicas", totals.onHand], ["Reservadas", totals.reserved], ["Disponibles", totals.onHand - totals.reserved]].map(([l, v]) => (
          <div key={l as string} className="rounded-lg border border-steel-150 bg-white p-4">
            <p className="font-mono text-2xl font-semibold tabular-nums">{v}</p>
            <p className="text-[12.5px] text-steel-500">{l}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md bg-steel-100 p-1">
          {[[undefined, "Todos"], ["low", "Inventario bajo"], ["out", "Agotados"]].map(([k, l]) => (
            <Link key={l} href={tab(k)} className={cn("rounded px-3 py-1.5 text-[13px] font-medium", stock === k ? "bg-white text-ink shadow-sm" : "text-steel-600 hover:text-ink")}>{l}</Link>
          ))}
        </div>
        <form action="/admin/inventario" className="relative w-full sm:w-80">
          {stock && <input type="hidden" name="stock" value={stock} />}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-steel-400" />
          <input name="q" defaultValue={sp.q} placeholder="Buscar SKU o nombre…" className="field-input pl-9" aria-label="Buscar" />
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Warehouse className="size-5" />} title="Sin resultados" description="No hay productos con estos criterios." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-steel-150 bg-white">
          <table className="table-base min-w-[820px]">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Ubicación</th>
                <th className="text-right">Físico</th>
                <th className="text-right">Reservado</th>
                <th className="text-right">Disponible</th>
                <th className="text-right">Mínimo</th>
                <th>Estado</th>
                <th>Último cambio</th>
                {can(r, "inventory.manage") && <th />}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.productId}>
                  <td>
                    <Link href={`/admin/productos/${x.productId}`} className="block max-w-xs">
                      <span className="block truncate font-medium text-ink hover:underline">{x.name}</span>
                      <span className="sku">{x.sku}</span>
                    </Link>
                  </td>
                  <td className="text-[13px] text-steel-600">{x.location ?? "—"}</td>
                  <td className="text-right font-mono tabular-nums">{x.onHand}</td>
                  <td className="text-right font-mono text-climb-600 tabular-nums">{x.reserved || "—"}</td>
                  <td className={cn("text-right font-mono font-semibold tabular-nums", x.available <= 0 ? "text-err-600" : x.available <= x.minStock ? "text-warn-600" : "text-ink")}>{x.available}</td>
                  <td className="text-right font-mono text-steel-500 tabular-nums">{x.minStock}</td>
                  <td><ProductStatusBadge status={x.status} /></td>
                  <td className="text-[12.5px] whitespace-nowrap text-steel-500">{formatDate(x.updatedAt)}</td>
                  {can(r, "inventory.manage") && (
                    <td className="text-right"><MovementButton productId={x.productId} sku={x.sku} name={x.name} onHand={x.onHand} reserved={x.reserved} variant="ghost" /></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
