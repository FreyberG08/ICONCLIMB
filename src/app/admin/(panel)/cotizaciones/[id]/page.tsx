import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminRepo } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { QUOTE_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/admin/page-header";
import { Timeline } from "@/components/admin/timeline";
import { CustomerCard } from "@/components/admin/customer-card";
import { NoteForm, StatusControl } from "@/components/admin/request-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/misc";

export const metadata = { title: "Cotización" };

export default async function QuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const repo = await getAdminRepo("quotes.manage");
  const q = await repo.getQuote(id);
  if (!q) notFound();
  const label = (_: string, v: string | null) => (!v ? "—" : QUOTE_STATUS[v as keyof typeof QUOTE_STATUS]?.label ?? v);
  return (
    <>
      <PageHeader
        title={<span className="font-mono">{q.number}</span>}
        description={`Recibida el ${formatDate(q.createdAt, true)}`}
        back={{ href: "/admin/cotizaciones", label: "Cotizaciones" }}
        actions={<Badge tone={QUOTE_STATUS[q.status].tone} dot>{QUOTE_STATUS[q.status].label}</Badge>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Artículos solicitados" />
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>SKU</th><th>Producto / descripción</th><th className="text-right">Cant.</th><th>Observación</th></tr></thead>
                <tbody>
                  {q.items.map((i, idx) => (
                    <tr key={idx}>
                      <td className="sku">{i.sku}</td>
                      <td>{i.productId ? <Link href={`/admin/productos/${i.productId}`} className="hover:underline">{i.name}</Link> : <span>{i.name} <span className="ml-1 rounded bg-warn-50 px-1.5 py-0.5 text-[11px] text-warn-600">No catalogado</span></span>}</td>
                      <td className="text-right font-mono tabular-nums">{i.quantity}</td>
                      <td className="text-[13px] text-steel-600">{i.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card>
            <CardHeader title="Historial" />
            <div className="space-y-6 p-5">
              <Timeline events={q.events} labelFor={label} />
              <div className="border-t border-steel-100 pt-5"><NoteForm kind="quote" id={q.id} /></div>
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card><CardHeader title="Cliente" /><div className="p-5"><CustomerCard c={q.customer} number={q.number} /></div></Card>
          <Card><CardHeader title="Estado" description="La cotización formal se envía por correo o WhatsApp; registre aquí cada avance." /><div className="p-5"><StatusControl kind="quote" id={q.id} current={q.status} /></div></Card>
        </div>
      </div>
    </>
  );
}
