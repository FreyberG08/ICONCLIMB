"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { trackRequest } from "@/app/(store)/actions";
import type { TrackingResult } from "@/lib/types";
import { ORDER_STATUS, PAYMENT_STATUS, QUOTE_STATUS } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";
import { Alert } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

function statusInfo(r: TrackingResult, s: string | null) {
  if (!s) return { label: "—", tone: "neutral" as const };
  const map = r.kind === "order" ? ORDER_STATUS : QUOTE_STATUS;
  return (map as Record<string, { label: string; tone: "blue" }>)[s] ?? { label: s, tone: "neutral" as const };
}

export function TrackingForm({ initialNumber }: { initialNumber?: string }) {
  const [number, setNumber] = useState(initialNumber ?? "");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<TrackingResult | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-8">
      <form
        className="grid gap-4 rounded-xl border border-steel-150 bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await trackRequest(number, email);
            if (!res.ok) {
              setError(res.error);
              setResult(undefined);
            } else setResult(res.data);
          });
        }}
      >
        <Field label="Número de referencia" htmlFor="t-number">
          <Input id="t-number" required value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())} placeholder="ICN-P2611-00001" className="font-mono" />
        </Field>
        <Field label="Correo usado en la solicitud" htmlFor="t-email">
          <Input id="t-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Button type="submit" size="lg" loading={pending} className="sm:h-[42px]"><Search className="size-4" /> Consultar</Button>
      </form>

      {error && <Alert tone="error">{error}</Alert>}
      {result === null && <Alert tone="warning" title="No encontramos la solicitud">Verifique el número de referencia y el correo electrónico utilizado.</Alert>}

      {result && (
        <div className="rounded-xl border border-steel-150 bg-white animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-steel-100 p-5 sm:p-6">
            <div>
              <p className="eyebrow">{result.kind === "order" ? "Pedido" : "Cotización"}</p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink">{result.number}</p>
              <p className="text-[13px] text-steel-500">Registrado el {formatDate(result.createdAt, true)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusInfo(result, result.status).tone} dot>{statusInfo(result, result.status).label}</Badge>
              {result.paymentStatus && <Badge tone={PAYMENT_STATUS[result.paymentStatus as keyof typeof PAYMENT_STATUS]?.tone ?? "neutral"}>{PAYMENT_STATUS[result.paymentStatus as keyof typeof PAYMENT_STATUS]?.label}</Badge>}
            </div>
          </div>
          <div className="grid gap-8 p-5 sm:p-6 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold">Artículos</h2>
              <ul className="mt-3 divide-y divide-steel-100 text-[13.5px]">
                {result.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-3 py-2"><span><span className="sku mr-2">{it.sku}</span>{it.name}</span><span className="font-mono">×{it.quantity}</span></li>
                ))}
              </ul>
              {result.total != null && result.currency && <p className="mt-3 text-right text-sm">Subtotal: <strong className="tabular-nums">{formatMoney(result.total, result.currency)}</strong></p>}
            </div>
            <div>
              <h2 className="text-sm font-semibold">Historial</h2>
              <ol className="mt-3 space-y-4 border-l border-steel-200 pl-4">
                {result.events.map((ev, i) => (
                  <li key={i} className="relative">
                    <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-white bg-climb-500" aria-hidden="true" />
                    <p className="text-[13.5px] font-medium text-ink">{statusInfo(result, ev.to).label}</p>
                    {ev.note && <p className="text-[13px] text-steel-600">{ev.note}</p>}
                    <p className="font-mono text-[11px] text-steel-400">{formatDate(ev.at, true)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
