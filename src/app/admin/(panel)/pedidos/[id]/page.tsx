import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminRepo } from "@/lib/data";
import { can } from "@/lib/permissions";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/admin/page-header";
import { Timeline } from "@/components/admin/timeline";
import { CustomerCard } from "@/components/admin/customer-card";
import { NoteForm, PaymentControl, StatusControl } from "@/components/admin/request-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/misc";

export const metadata = { title: "Pedido" };

const STOCK_LABEL = { reserved: "Unidades reservadas", consumed: "Existencia descontada (despachado)", released: "Reserva liberada" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const repo = await getAdminRepo("orders.view");
  const o = await repo.getOrder(id);
  if (!o) notFound();
  const manage = can(repo.user.role, "orders.manage");
  const label = (k: string, v: string | null) => (!v ? "—" : k === "payment" ? PAYMENT_STATUS[v as keyof typeof PAYMENT_STATUS]?.label ?? v : ORDER_STATUS[v as keyof typeof ORDER_STATUS]?.label ?? v);

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{o.number}</span>}
        description={`Registrado el ${formatDate(o.createdAt, true)} · ${STOCK_LABEL[o.stockState]}`}
        back={{ href: "/admin/pedidos", label: "Pedidos" }}
        actions={<><Badge tone={ORDER_STATUS[o.status].tone} dot>{ORDER_STATUS[o.status].label}</Badge><Badge tone={PAYMENT_STATUS[o.paymentStatus].tone}>{PAYMENT_STATUS[o.paymentStatus].label}</Badge></>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Artículos" description="Precios validados en el servidor al registrar el pedido." />
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>SKU</th><th>Producto</th><th className="text-right">Precio</th><th className="text-right">Cant.</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {o.items.map((i, idx) => (
                    <tr key={idx}>
                      <td className="sku">{i.sku}</td>
                      <td>{i.productId ? <Link href={`/admin/productos/${i.productId}`} className="hover:underline">{i.name}</Link> : i.name}</td>
                      <td className="text-right font-mono tabular-nums">{formatMoney(i.unitPrice, o.currency)}</td>
                      <td className="text-right font-mono tabular-nums">{i.quantity}</td>
                      <td className="text-right font-mono font-medium tabular-nums">{formatMoney(i.lineTotal, o.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={4} className="px-3 py-3 text-right text-sm font-medium">Total</td><td className="px-3 py-3 text-right font-mono text-base font-semibold tabular-nums">{formatMoney(o.total, o.currency)}</td></tr>
                </tfoot>
              </table>
            </div>
            <p className="border-t border-steel-100 px-5 py-3 text-[12px] text-steel-500">Impuestos y envío no calculados: se acuerdan con el cliente (pendiente de integración de facturación y envíos).</p>
          </Card>
          <Card>
            <CardHeader title="Historial" />
            <div className="space-y-6 p-5">
              <Timeline events={o.events} labelFor={label} />
              {manage && <div className="border-t border-steel-100 pt-5"><NoteForm kind="order" id={o.id} /></div>}
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card><CardHeader title="Cliente" /><div className="p-5"><CustomerCard c={o.customer} number={o.number} /></div></Card>
          {manage && (
            <>
              <Card><CardHeader title="Estado del pedido" /><div className="p-5"><StatusControl kind="order" id={o.id} current={o.status} closed={["delivered", "cancelled"].includes(o.status)} /></div></Card>
              <Card><CardHeader title="Pago" /><div className="p-5"><PaymentControl id={o.id} current={o.paymentStatus} /></div></Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
