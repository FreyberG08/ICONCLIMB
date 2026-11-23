"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, ClipboardList, PackagePlus, Plus, Trash2 } from "lucide-react";
import { useStore } from "./store-state";
import { useLiveProducts } from "./use-live-products";
import { QuantityInput } from "./quantity";
import { ProductImage } from "./product-image";
import { CustomerFields, emptyCustomer, Honeypot, type CustomerDraft } from "./customer-fields";
import { submitQuote } from "@/app/(store)/actions";
import { Alert } from "@/components/ui/misc";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { safeCall } from "@/lib/client/safe-call";

interface CustomItem {
  key: string;
  description: string;
  quantity: number;
  notes: string;
}

export function QuoteView({ initialPiece }: { initialPiece?: string }) {
  const router = useRouter();
  const { quote, ready, setQuoteQuantity, setQuoteNotes, removeFromQuote, clearQuote } = useStore();
  const live = useLiveProducts(quote.map((l) => l.productId), ready);
  const [custom, setCustom] = useState<CustomItem[]>([]);
  const [customer, setCustomer] = useState<CustomerDraft>(emptyCustomer);
  const [hp, setHp] = useState("");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (initialPiece) setCustom([{ key: "init", description: initialPiece.slice(0, 200), quantity: 1, notes: "" }]);
  }, [initialPiece]);

  if (!ready) return <div className="skeleton h-96" />;

  const unavailable = quote.filter((l) => !live.loading && !live.map.has(l.productId));
  const total = quote.length + custom.length;

  return (
    <form
      className="grid gap-8 lg:grid-cols-[1fr_400px]"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!total) return setError("Agregue al menos un repuesto a la solicitud.");
        if (!accept) return setError("Debe aceptar el tratamiento de datos para continuar.");
        start(async () => {
          const res = await safeCall(() => submitQuote({
            items: [
              ...quote.filter((l) => live.map.has(l.productId)).map((l) => ({ productId: l.productId, description: null, quantity: l.quantity, notes: l.notes })),
              ...custom.map((c) => ({ productId: null, description: c.description, quantity: c.quantity, notes: c.notes })),
            ],
            customer,
            website: hp,
          }));
          if (!res.ok) return setError(res.error);
          clearQuote();
          router.push(`/cotizacion/enviada?n=${encodeURIComponent(res.data.number)}`);
        });
      }}
    >
      <div className="relative space-y-6">
        <Honeypot value={hp} onChange={setHp} />
        <section className="rounded-xl border border-steel-150 bg-white">
          <header className="flex items-center justify-between border-b border-steel-100 px-5 py-4">
            <h2 className="text-base font-semibold">Repuestos a cotizar <span className="ml-1 font-mono text-sm text-steel-400">{total}</span></h2>
            <Link href="/catalogo" className="text-[13px] font-medium text-climb-700 hover:underline">Agregar del catálogo</Link>
          </header>
          {quote.length === 0 && custom.length === 0 && (
            <div className="px-5 py-10 text-center">
              <ClipboardList className="mx-auto size-6 text-steel-300" />
              <p className="mt-3 text-sm text-steel-600">Su lista está vacía. Agregue productos desde el catálogo o describa una pieza que no encuentre.</p>
            </div>
          )}
          <ul className="divide-y divide-steel-100">
            {quote.map((l) => {
              const p = live.map.get(l.productId);
              const missing = !live.loading && !p;
              return (
                <li key={l.productId} className="flex gap-4 p-4 sm:p-5">
                  <div className="w-16 shrink-0 sm:w-20"><ProductImage src={p?.imageUrl ?? l.snapshot.imageUrl} alt={l.snapshot.name} sku={l.snapshot.sku} sizes="80px" /></div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="sku">{l.snapshot.sku}</p>
                        <Link href={`/producto/${l.snapshot.slug}`} className="block text-[14.5px] font-medium text-ink hover:underline">{p?.name ?? l.snapshot.name}</Link>
                        {missing && <p className="mt-1 flex items-center gap-1 text-[12.5px] text-warn-600"><AlertTriangle className="size-3.5" /> Ya no está publicado; no se incluirá.</p>}
                      </div>
                      <button type="button" onClick={() => removeFromQuote(l.productId)} className="text-steel-400 hover:text-err-600" aria-label={`Quitar ${l.snapshot.name}`}><Trash2 className="size-4" /></button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <QuantityInput size="sm" value={l.quantity} onChange={(n) => setQuoteQuantity(l.productId, n)} max={99999} />
                      <input value={l.notes} onChange={(e) => setQuoteNotes(l.productId, e.target.value)} placeholder="Observación (opcional)" aria-label="Observación del artículo" className="field-input !h-9 min-w-0 flex-1 !py-1 text-sm" />
                    </div>
                  </div>
                </li>
              );
            })}
            {custom.map((c, idx) => (
              <li key={c.key} className="space-y-3 bg-steel-25 p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] tracking-wider text-steel-500 uppercase">Pieza no catalogada</span>
                  <button type="button" onClick={() => setCustom((list) => list.filter((x) => x.key !== c.key))} className="text-steel-400 hover:text-err-600" aria-label="Quitar pieza"><Trash2 className="size-4" /></button>
                </div>
                <Field label="Descripción o referencia de la pieza" htmlFor={`cd-${c.key}`} required>
                  <Input id={`cd-${c.key}`} required minLength={3} maxLength={200} value={c.description} placeholder="Ej.: tarjeta de botonera, marca, modelo, referencia impresa…" onChange={(e) => setCustom((list) => list.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))} />
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <QuantityInput size="sm" value={c.quantity} max={99999} onChange={(n) => setCustom((list) => list.map((x, i) => (i === idx ? { ...x, quantity: n } : x)))} />
                  <input value={c.notes} onChange={(e) => setCustom((list) => list.map((x, i) => (i === idx ? { ...x, notes: e.target.value.slice(0, 500) } : x)))} placeholder="Marca y modelo del ascensor (opcional)" aria-label="Datos del equipo" className="field-input !h-9 min-w-0 flex-1 !py-1 text-sm" />
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-steel-100 p-4">
            <button type="button" onClick={() => setCustom((l) => [...l, { key: crypto.randomUUID(), description: "", quantity: 1, notes: "" }])} className="inline-flex items-center gap-2 text-[13.5px] font-medium text-climb-700 hover:underline">
              <PackagePlus className="size-4" /> Agregar una pieza que no está en el catálogo
            </button>
          </div>
        </section>
        {unavailable.length > 0 && <Alert tone="warning">Algunos productos de su lista ya no están publicados y no se incluirán en la solicitud.</Alert>}
      </div>

      <aside className="h-fit space-y-5 rounded-xl border border-steel-150 bg-white p-5 sm:p-6 lg:sticky lg:top-24">
        <div>
          <h2 className="text-base font-semibold">Sus datos</h2>
          <p className="mt-1 text-[13px] text-steel-500">Le enviaremos la cotización formal y un número de referencia para seguimiento.</p>
        </div>
        <CustomerFields value={customer} onChange={setCustomer} notesLabel="Observaciones generales" notesHint="Marca y modelo del ascensor, urgencia, condiciones de entrega…" />
        <Checkbox checked={accept} onChange={(e) => setAccept(e.target.checked)} label="Acepto que mis datos se usen para gestionar esta solicitud." description={<>Ver <Link href="/privacidad" className="underline">política de privacidad</Link>.</>} />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" variant="dark" className="w-full" loading={pending} disabled={!total}>
          <Plus className="size-4" /> Enviar solicitud de cotización
        </Button>
        <LinkButton href="/catalogo" variant="ghost" className="w-full">Seguir agregando productos</LinkButton>
      </aside>
    </form>
  );
}
