import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import { getAdminRepo } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUS, ORDER_STATUS_ORDER, PAYMENT_STATUS } from "@/lib/labels";
import type { OrderStatus } from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

export const metadata = { title: "Pedidos" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string }> }) {
  const sp = await searchParams;
  const repo = await getAdminRepo("orders.view");
  const status = sp.estado === "all" ? "all" : (ORDER_STATUS_ORDER as string[]).includes(sp.estado ?? "") ? (sp.estado as OrderStatus) : "open";
  const orders = await repo.listOrders({ status, q: sp.q });
  const tabs: [string, string][] = [["open", "Abiertos"], ...ORDER_STATUS_ORDER.map((s) => [s, ORDER_STATUS[s].label] as [string, string]), ["all", "Todos"]];

  return (
    <>
      <PageHeader title="Pedidos" description="Pedidos de compra directa registrados en la tienda. Las unidades se reservan al registrarse y se descuentan al despachar." />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-steel-200">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/admin/pedidos?estado=${k}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={cn("-mb-px border-b-2 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap", status === k ? "border-climb-600 text-ink" : "border-transparent text-steel-500 hover:text-ink")}>{l}</Link>
        ))}
      </div>
      <form action="/admin/pedidos" className="relative mb-5 max-w-md">
        <input type="hidden" name="estado" value={status} />
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-steel-400" />
        <input name="q" defaultValue={sp.q} placeholder="Número, cliente, empresa o correo…" className="field-input pl-9" aria-label="Buscar pedidos" />
      </form>
      {orders.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="size-5" />} title="No hay pedidos en esta bandeja" description="Los pedidos registrados desde el carrito aparecerán aquí." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-steel-150 bg-white">
          <table className="table-base min-w-[820px]">
            <thead><tr><th>Número</th><th>Cliente</th><th>Fecha</th><th className="text-right">Unidades</th><th className="text-right">Total</th><th>Estado</th><th>Pago</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/pedidos/${o.id}`} className="font-mono text-[13px] font-medium text-climb-700 hover:underline">{o.number}</Link></td>
                  <td><span className="block text-[13.5px] text-ink">{o.customerName}</span><span className="block text-[12px] text-steel-500">{o.company ?? o.email}</span></td>
                  <td className="text-[12.5px] whitespace-nowrap text-steel-500">{formatDate(o.createdAt, true)}</td>
                  <td className="text-right font-mono tabular-nums">{o.itemCount}</td>
                  <td className="text-right font-mono font-medium tabular-nums">{formatMoney(o.total, o.currency)}</td>
                  <td><Badge tone={ORDER_STATUS[o.status].tone} dot>{ORDER_STATUS[o.status].label}</Badge></td>
                  <td><Badge tone={PAYMENT_STATUS[o.paymentStatus].tone}>{PAYMENT_STATUS[o.paymentStatus].label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
