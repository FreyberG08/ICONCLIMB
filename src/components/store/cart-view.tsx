"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ClipboardList, ShoppingCart, Trash2 } from "lucide-react";
import { useStore } from "./store-state";
import { useLiveProducts } from "./use-live-products";
import { QuantityInput } from "./quantity";
import { ProductImage } from "./product-image";
import { formatMoney, fromCents, toCents } from "@/lib/format";
import { availabilityLabel } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export function useCartTotals() {
  const { cart, ready } = useStore();
  const live = useLiveProducts(cart.map((l) => l.productId), ready);
  const lines = cart.map((l) => {
    const p = live.map.get(l.productId);
    let problem: string | null = null;
    if (!live.loading) {
      if (!p) problem = "Este producto ya no está disponible.";
      else if (p.saleMode !== "direct" || p.price == null) problem = "Ahora se comercializa bajo cotización.";
      else if (p.availability === "out_of_stock") problem = "Sin unidades disponibles.";
    }
    return { line: l, product: p, problem };
  });
  const valid = lines.filter((x) => x.product && !x.problem);
  const currencies = [...new Set(valid.map((x) => x.product!.currency))];
  const totalCents = valid.reduce((s, x) => s + toCents(x.product!.price!) * x.line.quantity, 0);
  return { ready, loading: live.loading, lines, valid, currencies, total: fromCents(totalCents) };
}

export function CartView() {
  const { setCartQuantity, removeFromCart, addToQuote, notify } = useStore();
  const { ready, loading, lines, valid, currencies, total } = useCartTotals();

  if (!ready) return <div className="skeleton h-64" />;
  if (!lines.length) {
    return (
      <EmptyState
        icon={<ShoppingCart className="size-5" />}
        title="Su carrito está vacío"
        description="Agregue repuestos de compra directa desde el catálogo. Los productos bajo cotización se agregan a su lista de cotización."
        action={<LinkButton href="/catalogo">Explorar catálogo</LinkButton>}
      />
    );
  }

  const blocking = lines.some((x) => x.problem) || currencies.length > 1;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <ul className="divide-y divide-steel-150 rounded-xl border border-steel-150 bg-white">
        {lines.map(({ line, product, problem }) => {
          const price = product?.price ?? line.snapshot.price;
          const currency = product?.currency ?? line.snapshot.currency;
          const avail = product ? availabilityLabel(product.availability, product.saleMode) : null;
          return (
            <li key={line.productId} className="flex gap-4 p-4 sm:p-5">
              <Link href={`/producto/${line.snapshot.slug}`} className="w-20 shrink-0 sm:w-24">
                <ProductImage src={product?.imageUrl ?? line.snapshot.imageUrl} alt={line.snapshot.name} sku={line.snapshot.sku} sizes="96px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="sku">{line.snapshot.sku}</p>
                  <Link href={`/producto/${line.snapshot.slug}`} className="mt-0.5 block text-[15px] leading-snug font-medium text-ink hover:underline">
                    {product?.name ?? line.snapshot.name}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {avail && <Badge tone={avail.tone} dot>{avail.label}</Badge>}
                    {price != null && <span className="text-[13px] text-steel-500 tabular-nums">{formatMoney(price, currency)} c/u</span>}
                  </div>
                  {problem && (
                    <p className="mt-2 flex items-center gap-1.5 text-[13px] text-warn-600">
                      <AlertTriangle className="size-3.5" /> {problem}
                      {product && product.saleMode === "quote" && (
                        <button
                          type="button"
                          className="font-medium underline"
                          onClick={() => {
                            addToQuote(line.productId, line.quantity, line.snapshot);
                            removeFromCart(line.productId);
                            notify("Movido a su lista de cotización", "/cotizacion", "Ver lista");
                          }}
                        >
                          Mover a cotización
                        </button>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <QuantityInput size="sm" value={line.quantity} onChange={(n) => setCartQuantity(line.productId, n)} />
                  <p className="min-w-24 text-right text-[15px] font-semibold text-ink tabular-nums">
                    {price != null && !problem ? formatMoney(fromCents(toCents(price) * line.quantity), currency) : "—"}
                  </p>
                  <button type="button" onClick={() => removeFromCart(line.productId)} className="ml-auto inline-flex items-center gap-1 text-[12.5px] text-steel-500 hover:text-err-600 sm:ml-0" aria-label={`Quitar ${line.snapshot.name}`}>
                    <Trash2 className="size-3.5" /> Quitar
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-xl border border-steel-150 bg-steel-25 p-6 lg:sticky lg:top-24">
        <h2 className="text-base font-semibold">Resumen</h2>
        <dl className="mt-5 space-y-2.5 text-sm">
          <div className="flex justify-between"><dt className="text-steel-500">Artículos</dt><dd className="tabular-nums">{valid.reduce((s, x) => s + x.line.quantity, 0)}</dd></div>
          <div className="flex justify-between"><dt className="text-steel-500">Impuestos y envío</dt><dd className="text-steel-500">Por confirmar</dd></div>
          <div className="flex items-baseline justify-between border-t border-steel-200 pt-3">
            <dt className="font-medium text-ink">Subtotal</dt>
            <dd className="text-xl font-semibold text-ink tabular-nums">{loading ? "…" : currencies.length === 1 ? formatMoney(total, currencies[0]) : "—"}</dd>
          </div>
        </dl>
        {currencies.length > 1 && <p className="mt-3 text-[12.5px] text-warn-600">El carrito contiene productos en monedas distintas. Realice pedidos separados por moneda.</p>}
        <LinkButton href="/carrito/pedido" size="lg" className={`mt-6 w-full ${blocking || loading ? "pointer-events-none opacity-50" : ""}`} aria-disabled={blocking || loading}>
          Continuar con el pedido <ArrowRight className="size-4" />
        </LinkButton>
        {blocking && <p className="mt-3 text-[12.5px] text-steel-500">Resuelva los avisos marcados para continuar.</p>}
        <p className="mt-4 text-[12px] leading-relaxed text-steel-500">
          Precios y disponibilidad se validan nuevamente al registrar el pedido. No se realiza ningún cobro en línea.
        </p>
        <Link href="/cotizacion" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-climb-700 hover:underline">
          <ClipboardList className="size-3.5" /> Ir a mi lista de cotización
        </Link>
      </aside>
    </div>
  );
}
