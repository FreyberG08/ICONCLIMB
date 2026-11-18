"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addOrderNoteAction, addQuoteNoteAction, setOrderPaymentAction, setOrderStatusAction, setQuoteStatusAction } from "@/app/admin/actions";
import { ORDER_STATUS, ORDER_STATUS_ORDER, PAYMENT_STATUS, QUOTE_STATUS, QUOTE_STATUS_ORDER } from "@/lib/labels";
import type { OrderStatus, PaymentStatus, QuoteStatus } from "@/lib/types";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";

type Kind = "order" | "quote";

export function StatusControl({ kind, id, current, closed }: { kind: Kind; id: string; current: string; closed?: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const options = kind === "order" ? ORDER_STATUS_ORDER.map((s) => [s, ORDER_STATUS[s].label]) : QUOTE_STATUS_ORDER.map((s) => [s, QUOTE_STATUS[s].label]);
  const help = kind === "order" ? ORDER_STATUS[status as OrderStatus]?.help : null;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (kind === "order" && status === "cancelled" && !confirm("¿Cancelar el pedido? Se liberarán las unidades reservadas.")) return;
        if (kind === "order" && (status === "shipped" || status === "delivered") && !confirm("Se descontará la existencia física de los productos del pedido. ¿Continuar?")) return;
        start(async () => {
          const res = kind === "order" ? await setOrderStatusAction(id, status as OrderStatus, note) : await setQuoteStatusAction(id, status as QuoteStatus, note);
          if (!res.ok) return setError(res.error);
          setNote("");
          router.refresh();
        });
      }}
    >
      <Field label="Estado" htmlFor={`st-${id}`} hint={help}>
        <Select id={`st-${id}`} value={status} onChange={(e) => setStatus(e.target.value)} disabled={closed}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <Field label="Mensaje para el cliente (visible en seguimiento)" htmlFor={`stn-${id}`}>
        <Textarea id={`stn-${id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} disabled={closed} />
      </Field>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" className="w-full" loading={pending} disabled={closed || status === current}>Actualizar estado</Button>
      {closed && <p className="text-[12px] text-steel-500">El pedido está cerrado.</p>}
    </form>
  );
}

export function PaymentControl({ id, current }: { id: string; current: PaymentStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<PaymentStatus>(current);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (status === "paid" && !confirm("Confirme que el pago fue verificado (transferencia, depósito u otro medio). Esta acción queda auditada.")) return;
        start(async () => {
          const res = await setOrderPaymentAction(id, status, note);
          if (!res.ok) return setError(res.error);
          setNote("");
          router.refresh();
        });
      }}
    >
      <Field label="Estado de pago" htmlFor={`pay-${id}`} hint="Registro manual: no existe pasarela de pago integrada.">
        <Select id={`pay-${id}`} value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
          {Object.entries(PAYMENT_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </Select>
      </Field>
      <Field label="Referencia / comprobante" htmlFor={`payn-${id}`}>
        <Textarea id={`payn-${id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nº de transferencia, banco, fecha…" />
      </Field>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" variant="outline" className="w-full" loading={pending} disabled={status === current}>Registrar pago</Button>
    </form>
  );
}

export function NoteForm({ kind, id }: { kind: Kind; id: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = kind === "order" ? await addOrderNoteAction(id, note) : await addQuoteNoteAction(id, note);
          if (!res.ok) return setError(res.error);
          setNote("");
          setError(null);
          router.refresh();
        });
      }}
    >
      <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota interna (no visible para el cliente)…" aria-label="Nota interna" />
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" size="sm" variant="secondary" loading={pending} disabled={!note.trim()}>Agregar nota</Button>
    </form>
  );
}
