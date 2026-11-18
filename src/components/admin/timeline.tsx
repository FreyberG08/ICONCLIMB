import { Lock } from "lucide-react";
import type { TimelineEvent } from "@/lib/types";
import { formatDate } from "@/lib/format";

export function Timeline({ events, labelFor }: { events: TimelineEvent[]; labelFor: (kind: string, value: string | null) => string }) {
  return (
    <ol className="space-y-5 border-l border-steel-200 pl-5">
      {[...events].reverse().map((e) => (
        <li key={e.id} className="relative">
          <span className={`absolute top-1 -left-[26px] size-3 rounded-full border-2 border-white ${e.kind === "note" ? "bg-steel-400" : e.kind === "payment" ? "bg-ok-600" : "bg-climb-500"}`} aria-hidden="true" />
          <p className="text-[13.5px] text-ink">
            {e.kind === "created" && <>Solicitud registrada</>}
            {e.kind === "status" && <>Estado: <span className="text-steel-500">{labelFor("status", e.fromValue)}</span> → <strong className="font-medium">{labelFor("status", e.toValue)}</strong></>}
            {e.kind === "payment" && <>Pago: <span className="text-steel-500">{labelFor("payment", e.fromValue)}</span> → <strong className="font-medium">{labelFor("payment", e.toValue)}</strong></>}
            {e.kind === "note" && <span className="inline-flex items-center gap-1 font-medium">Nota interna <Lock className="size-3 text-steel-400" /></span>}
          </p>
          {e.note && <p className="mt-1 rounded-md bg-steel-50 px-3 py-2 text-[13px] whitespace-pre-line text-steel-700">{e.note}</p>}
          <p className="mt-1 font-mono text-[11px] text-steel-400">{formatDate(e.createdAt, true)} · {e.actorLabel}{e.isInternal && e.kind !== "note" ? " · interno" : ""}</p>
        </li>
      ))}
    </ol>
  );
}
