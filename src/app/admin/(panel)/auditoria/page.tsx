import Link from "next/link";
import { getAdminRepo } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

export const metadata = { title: "Auditoría" };

const ENTITIES: Record<string, string> = {
  products: "Productos", product_costs: "Costos", product_internal: "Datos internos", product_images: "Fotografías",
  product_documents: "Documentos", product_compatibilities: "Compatibilidades", categories: "Categorías", brands: "Marcas", profiles: "Usuarios",
};
const ACTIONS: Record<string, string> = { insert: "Creación", update: "Modificación", delete: "Eliminación" };

function summarize(details: Record<string, unknown>) {
  const keys = Object.keys(details).filter((k) => !["id", "created_at", "updated_at", "search_text", "created_by"].includes(k));
  if (!keys.length) return "—";
  return keys.slice(0, 6).map((k) => {
    const v = details[k] as { from?: unknown; to?: unknown } | unknown;
    if (v && typeof v === "object" && "to" in (v as object)) {
      const { from, to } = v as { from: unknown; to: unknown };
      const fmt = (x: unknown) => (x == null ? "∅" : typeof x === "object" ? "…" : String(x).slice(0, 40));
      return `${k}: ${fmt(from)} → ${fmt(to)}`;
    }
    return `${k}: ${typeof v === "object" ? "…" : String(v).slice(0, 40)}`;
  }).join(" · ") + (keys.length > 6 ? ` (+${keys.length - 6})` : "");
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ entidad?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const repo = await getAdminRepo("audit.view");
  const entity = sp.entidad && sp.entidad in ENTITIES ? sp.entidad : undefined;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const res = await repo.listAudit({ entity, page, pageSize: 50 });
  return (
    <>
      <PageHeader title="Auditoría" description="Registro automático de cambios en catálogo, taxonomía y usuarios. Los movimientos de inventario y el historial de pedidos tienen su propio registro." />
      <div className="mb-4 flex flex-wrap gap-1">
        {[[undefined, "Todo"], ...Object.entries(ENTITIES)].map(([k, l]) => (
          <Link key={l} href={k ? `/admin/auditoria?entidad=${k}` : "/admin/auditoria"} className={cn("rounded-full px-3 py-1 text-[12.5px] font-medium", entity === k ? "bg-ink text-white" : "bg-white text-steel-600 ring-1 ring-steel-200 hover:text-ink")}>{l}</Link>
        ))}
      </div>
      {res.items.length === 0 ? (
        <EmptyState title="Sin registros" description="Los cambios realizados desde el panel aparecerán aquí." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-steel-150 bg-white">
          <table className="table-base min-w-[860px]">
            <thead><tr><th>Fecha</th><th>Responsable</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
            <tbody>
              {res.items.map((a) => (
                <tr key={a.id}>
                  <td className="font-mono text-[12px] whitespace-nowrap text-steel-500">{formatDate(a.createdAt, true)}</td>
                  <td className="text-[13px]">{a.actorLabel}</td>
                  <td className="text-[13px]">{ACTIONS[a.action] ?? a.action}</td>
                  <td className="text-[13px]">{a.entity === "products" && a.entityId ? <Link href={`/admin/productos/${a.entityId}`} className="text-climb-700 hover:underline">{ENTITIES[a.entity]}</Link> : ENTITIES[a.entity] ?? a.entity}</td>
                  <td className="max-w-[420px] font-mono text-[11.5px] text-steel-600">{summarize(a.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-6"><Pagination page={res.page} total={res.total} pageSize={res.pageSize} hrefFor={(n) => `/admin/auditoria?${new URLSearchParams({ ...(entity ? { entidad: entity } : {}), pagina: String(n) })}`} /></div>
    </>
  );
}
