import Link from "next/link";
import Image from "next/image";
import { ClipboardList, ImageOff, TrendingDown, TrendingUp } from "lucide-react";
import type { SalesRankRow, SalesRanking } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";

export const PERIODS: { key: string; label: string; days: number | null }[] = [
  { key: "30", label: "30 días", days: 30 },
  { key: "90", label: "90 días", days: 90 },
  { key: "365", label: "12 meses", days: 365 },
  { key: "todo", label: "Todo", days: null },
];

function Thumb({ src }: { src: string | null }) {
  return (
    <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-steel-150 bg-steel-50">
      {src ? <Image src={src} alt="" fill sizes="40px" className="object-contain p-0.5" /> : <ImageOff className="size-4 text-steel-300" />}
    </span>
  );
}

function List({ rows, tone, metric, empty }: { rows: SalesRankRow[]; tone: "ok" | "warn" | "blue"; metric: "units" | "requests"; empty: string }) {
  if (!rows.length) return <p className="px-5 py-8 text-center text-[13px] text-steel-500">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => (metric === "units" ? r.units : r.orders)));
  const bar = { ok: "bg-ok-600", warn: "bg-warn-600", blue: "bg-climb-500" }[tone];
  return (
    <ol className="divide-y divide-steel-100">
      {rows.map((r, i) => {
        const value = metric === "units" ? r.units : r.orders;
        return (
          <li key={r.productId}>
            <Link href={`/admin/productos/${r.productId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-steel-25">
              <span className="w-4 font-mono text-[11px] text-steel-400">{i + 1}</span>
              <Thumb src={r.imageUrl} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-ink">{r.name}</span>
                <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-steel-100">
                  <span className={cn("block h-full rounded-full", bar)} style={{ width: `${value ? Math.max(6, (value / max) * 100) : 0}%` }} />
                </span>
              </span>
              <span className="shrink-0 text-right">
                {metric === "units" ? (
                  value > 0 ? (
                    <>
                      <span className="block font-mono text-[14px] font-semibold text-ink tabular-nums">{r.units} u.</span>
                      <span className="block text-[11.5px] text-steel-500 tabular-nums">{formatMoney(r.revenue, r.currency)}</span>
                    </>
                  ) : (
                    <span className="rounded bg-warn-50 px-1.5 py-0.5 text-[11.5px] font-medium text-warn-600">Sin ventas</span>
                  )
                ) : (
                  <>
                    <span className="block font-mono text-[14px] font-semibold text-ink tabular-nums">{r.orders}</span>
                    <span className="block text-[11.5px] text-steel-500">{r.orders === 1 ? "solicitud" : "solicitudes"}</span>
                  </>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function SalesRankingSection({ ranking, periodKey, showQuotes }: { ranking: SalesRanking; periodKey: string; showQuotes: boolean }) {
  return (
    <section className="mt-8 rounded-lg border border-steel-150 bg-white" aria-labelledby="ranking-title">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-steel-100 px-5 py-4">
        <div>
          <h2 id="ranking-title" className="text-[15px] font-semibold">Rendimiento de ventas</h2>
          <p className="mt-0.5 text-[13px] text-steel-500">
            Unidades en pedidos registrados (sin cancelados) · {ranking.totalUnits} {ranking.totalUnits === 1 ? "unidad" : "unidades"} en el periodo
          </p>
        </div>
        <nav className="flex gap-1 rounded-md bg-steel-100 p-1" aria-label="Periodo">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/admin?periodo=${p.key}`}
              scroll={false}
              aria-current={p.key === periodKey ? "true" : undefined}
              className={cn("rounded px-2.5 py-1 text-[12.5px] font-medium", p.key === periodKey ? "bg-white text-ink shadow-sm" : "text-steel-600 hover:text-ink")}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className={cn("grid divide-y divide-steel-100 lg:divide-x lg:divide-y-0", showQuotes ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
        <div>
          <h3 className="flex items-center gap-2 px-5 pt-4 pb-1 text-[13px] font-semibold text-ok-600"><TrendingUp className="size-4" /> Más vendidos</h3>
          <List rows={ranking.best} tone="ok" metric="units" empty="Aún no hay ventas en este periodo." />
        </div>
        <div>
          <h3 className="flex items-center gap-2 px-5 pt-4 pb-1 text-[13px] font-semibold text-warn-600"><TrendingDown className="size-4" /> Menos vendidos</h3>
          <List rows={ranking.worst} tone="warn" metric="units" empty="No hay otros productos publicados de compra directa." />
        </div>
        {showQuotes && (
          <div>
            <h3 className="flex items-center gap-2 px-5 pt-4 pb-1 text-[13px] font-semibold text-climb-700"><ClipboardList className="size-4" /> Más cotizados</h3>
            <List rows={ranking.mostQuoted} tone="blue" metric="requests" empty="Aún no hay cotizaciones en este periodo." />
          </div>
        )}
      </div>
      <p className="border-t border-steel-100 px-5 py-3 text-[12px] text-steel-500">
        "Menos vendidos" incluye productos publicados de compra directa sin ventas en el periodo, para detectar artículos sin rotación.
      </p>
    </section>
  );
}
