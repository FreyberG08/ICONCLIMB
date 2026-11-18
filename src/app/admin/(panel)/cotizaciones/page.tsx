import Link from "next/link";
import { ClipboardList, Search } from "lucide-react";
import { getAdminRepo } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { QUOTE_STATUS, QUOTE_STATUS_ORDER } from "@/lib/labels";
import type { QuoteStatus } from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

export const metadata = { title: "Cotizaciones" };

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string }> }) {
  const sp = await searchParams;
  const repo = await getAdminRepo("quotes.manage");
  const status = sp.estado === "all" ? "all" : (QUOTE_STATUS_ORDER as string[]).includes(sp.estado ?? "") ? (sp.estado as QuoteStatus) : "open";
  const quotes = await repo.listQuotes({ status, q: sp.q });
  const tabs: [string, string][] = [["open", "Abiertas"], ...QUOTE_STATUS_ORDER.map((s) => [s, QUOTE_STATUS[s].label] as [string, string]), ["all", "Todas"]];
  return (
    <>
      <PageHeader title="Solicitudes de cotización" description="Bandeja independiente de los pedidos. Cada solicitud tiene número de referencia y seguimiento para el cliente." />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-steel-200">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/admin/cotizaciones?estado=${k}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={cn("-mb-px border-b-2 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap", status === k ? "border-climb-600 text-ink" : "border-transparent text-steel-500 hover:text-ink")}>{l}</Link>
        ))}
      </div>
      <form action="/admin/cotizaciones" className="relative mb-5 max-w-md">
        <input type="hidden" name="estado" value={status} />
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-steel-400" />
        <input name="q" defaultValue={sp.q} placeholder="Número, cliente, empresa o correo…" className="field-input pl-9" aria-label="Buscar cotizaciones" />
      </form>
      {quotes.length === 0 ? (
        <EmptyState icon={<ClipboardList className="size-5" />} title="No hay solicitudes en esta bandeja" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-steel-150 bg-white">
          <table className="table-base min-w-[720px]">
            <thead><tr><th>Número</th><th>Cliente</th><th>Fecha</th><th className="text-right">Ítems</th><th>Estado</th></tr></thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td><Link href={`/admin/cotizaciones/${q.id}`} className="font-mono text-[13px] font-medium text-climb-700 hover:underline">{q.number}</Link></td>
                  <td><span className="block text-[13.5px] text-ink">{q.customerName}</span><span className="block text-[12px] text-steel-500">{q.company ?? q.email}</span></td>
                  <td className="text-[12.5px] whitespace-nowrap text-steel-500">{formatDate(q.createdAt, true)}</td>
                  <td className="text-right font-mono tabular-nums">{q.itemCount}</td>
                  <td><Badge tone={QUOTE_STATUS[q.status].tone} dot>{QUOTE_STATUS[q.status].label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
