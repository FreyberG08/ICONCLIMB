"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { useStore } from "./store-state";
import { useCartTotals } from "./cart-view";
import { CustomerFields, emptyCustomer, Honeypot, type CustomerDraft } from "./customer-fields";
import { placeOrder } from "@/app/(store)/actions";
import { formatMoney, fromCents, toCents } from "@/lib/format";
import { Alert } from "@/components/ui/misc";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { safeCall } from "@/lib/client/safe-call";

export function CheckoutForm() {
  const router = useRouter();
  const { clearCart } = useStore();
  const { ready, loading, lines, valid, currencies, total } = useCartTotals();
  const [customer, setCustomer] = useState<CustomerDraft>(emptyCustomer);
  const [hp, setHp] = useState("");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!ready || loading) return <div className="skeleton h-96" />;
  if (!lines.length) {
    return (
      <Alert tone="info" title="No hay productos en el carrito">
        <Link href="/catalogo" className="underline">Volver al catálogo</Link>
      </Alert>
    );
  }
  const blocking = lines.some((x) => x.problem) || currencies.length !== 1;

  return (
    <form
      className="grid gap-8 lg:grid-cols-[1fr_380px]"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!accept) return setError("Debe aceptar el tratamiento de datos para continuar.");
        start(async () => {
          const res = await safeCall(() => placeOrder({
            items: valid.map((x) => ({ productId: x.line.productId, quantity: x.line.quantity })),
            customer,
            website: hp,
          }));
          if (!res.ok) {
            setError(res.error);
            return;
          }
          clearCart();
          router.push(`/pedido/confirmado?n=${encodeURIComponent(res.data.number)}`);
        });
      }}
    >
      <div className="relative space-y-8">
        <Honeypot value={hp} onChange={setHp} />
        <section className="rounded-xl border border-steel-150 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-semibold">Datos de contacto</h2>
          <p className="mt-1 text-[13.5px] text-steel-500">Un asesor confirmará disponibilidad, forma de pago y entrega.</p>
          <div className="mt-6">
            <CustomerFields value={customer} onChange={setCustomer} withAddress notesLabel="Observaciones del pedido" notesHint="Opcional · por ejemplo, horario de entrega o datos del equipo." />
          </div>
        </section>
        <section className="rounded-xl border border-steel-150 bg-white p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Lock className="size-4 text-steel-400" /> Pago</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-steel-600">
            La pasarela de pago en línea aún no está habilitada. Al registrar el pedido <strong className="font-medium text-ink">reservamos las unidades</strong> y
            un asesor le contactará para acordar la forma de pago. <strong className="font-medium text-ink">No se realiza ningún cobro en este paso.</strong>
          </p>
        </section>
        <Checkbox
          checked={accept}
          onChange={(e) => setAccept(e.target.checked)}
          label="Acepto que mis datos se usen para gestionar este pedido."
          description={<>Consulte nuestra <Link href="/privacidad" className="underline">política de privacidad</Link>.</>}
        />
        {error && <Alert tone="error" title="No se pudo registrar el pedido">{error}</Alert>}
      </div>

      <aside className="h-fit rounded-xl border border-steel-150 bg-steel-25 p-6 lg:sticky lg:top-24">
        <h2 className="text-base font-semibold">Su pedido</h2>
        <ul className="mt-4 space-y-3">
          {valid.map(({ line, product }) => (
            <li key={line.productId} className="flex justify-between gap-3 text-[13.5px]">
              <span className="min-w-0">
                <span className="block truncate text-ink">{product!.name}</span>
                <span className="sku">{product!.sku} · {line.quantity} × {formatMoney(product!.price, product!.currency)}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">{formatMoney(fromCents(toCents(product!.price!) * line.quantity), product!.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-baseline justify-between border-t border-steel-200 pt-4">
          <span className="font-medium">Subtotal</span>
          <span className="text-xl font-semibold tabular-nums">{currencies[0] ? formatMoney(total, currencies[0]) : "—"}</span>
        </div>
        <p className="mt-1 text-[12px] text-steel-500">Impuestos y envío se confirman con el asesor.</p>
        <Button type="submit" size="lg" className="mt-6 w-full" loading={pending} disabled={blocking}>
          Registrar pedido
        </Button>
        {blocking && <p className="mt-2 text-[12.5px] text-warn-600">Revise los avisos en su carrito antes de continuar.</p>}
        <LinkButton href="/carrito" variant="ghost" className="mt-2 w-full"><ArrowLeft className="size-4" /> Volver al carrito</LinkButton>
      </aside>
    </form>
  );
}
