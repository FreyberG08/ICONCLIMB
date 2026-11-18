import Link from "next/link";
import { getAdminRepo } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { MOVEMENT_TYPE } from "@/lib/labels";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/misc";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export const metadata = { title: "Movimientos de inventario" };

function Delta({ n }: { n: number }) {
  if (n === 0) return <span className="text-steel-300">0</span>;
  return <span className={n > 0 ? "text-ok-600" : "text-err-600"}>{n > 0 ? `+${n}` : n}</span>;
}

export default async function MovementsPage({ searchParams }: { searchParams: Promise<{ producto?: string; tipo?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const repo = await getAdminRepo("catalog.view");
  const productId = sp.producto && /^[0-9a-f-]{36}$/i.test(sp.producto) ? sp.producto : undefined;
  const type = sp.tipo && sp.tipo in MOVEMENT_TYPE ? sp.tipo : undefined;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const [res, product] = await Promise.all([
    repo.listMovements({ productId, type, page, pageSize: 50 }),
    productId ? repo.getProduct(productId) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        title="Movimientos de inventario"
        description={product ? <>Historial de <span className="sku">{product.sku}</span> · {product.name}</> : "Registro inmutable de entradas, salidas, ajustes, reservas y despachos."}
        back={{ href: product ? `/admin/productos/${product.id}` : "/admin/inventario", label: product ? "Producto" : "Inventario" }}
      />
      <form className="mb-4 flex flex-wrap gap-3" action="/admin/inventario/movimientos">
        {productId && <input type="hidden" name="producto" value={productId} />}
        <Select name="tipo" defaultValue={type ?? ""} className="w-56" aria-label="Tipo de movimiento">
          <option value="">Todos los tipos</option>
          {Object.entries(MOVEMENT_TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        <button className="h-10 rounded-md bg-ink px-4 text-sm font-medium text-white" type="submit">Filtrar</button>
        {productId && <Link href="/admin/inventario/movimientos" className="self-center text-[13px] text-climb-700 hover:underline">Ver todos los productos</Link>}
      </form>
      {res.items.length === 0 ? (
        <EmptyState title="Sin movimientos" description="Los movimientos aparecerán aquí a medida que se registren entradas, salidas o pedidos." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-steel-150 bg-white">
          <table className="table-base min-w-[960px]">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th className="text-right">Δ Físico</th>
                <th className="text-right">Δ Reserva</th>
                <th className="text-right">Resultado</th>
                <th>Motivo</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              {res.items.map((m) => (
                <tr key={m.id}>
                  <td className="font-mono text-[12px] whitespace-nowrap text-steel-500">{formatDate(m.createdAt, true)}</td>
                  <td>
                    <Link href={`/admin/inventario/movimientos?producto=${m.productId}`} className="block max-w-[220px]">
                      <span className="sku block">{m.sku}</span>
                      <span className="block truncate text-[13px] text-ink">{m.productName}</span>
                    </Link>
                  </td>
                  <td><span className={cn("rounded px-1.5 py-0.5 text-[12px] font-medium", ["entry"].includes(m.type) ? "bg-ok-50 text-ok-600" : ["exit", "sale"].includes(m.type) ? "bg-err-50 text-err-600" : "bg-steel-100 text-steel-700")}>{MOVEMENT_TYPE[m.type]}</span></td>
                  <td className="text-right font-mono tabular-nums"><Delta n={m.onHandDelta} /></td>
                  <td className="text-right font-mono tabular-nums"><Delta n={m.reservedDelta} /></td>
                  <td className="text-right font-mono text-[12px] whitespace-nowrap text-steel-600 tabular-nums">{m.onHandAfter} fís · {m.reservedAfter} res</td>
                  <td className="max-w-[240px] text-[13px] text-steel-700">{m.reason}{m.reference && <span className="sku block">{m.reference}</span>}</td>
                  <td className="text-[13px] text-steel-600">{m.actorLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-6">
        <Pagination page={res.page} total={res.total} pageSize={res.pageSize} hrefFor={(n) => `/admin/inventario/movimientos?${new URLSearchParams({ ...(productId ? { producto: productId } : {}), ...(type ? { tipo: type } : {}), pagina: String(n) })}`} />
      </div>
    </>
  );
}
