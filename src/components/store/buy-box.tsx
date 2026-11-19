"use client";

import { useState } from "react";
import { ClipboardList, Info, ShoppingCart } from "lucide-react";
import type { CatalogProduct } from "@/lib/types";
import { availabilityLabel } from "@/lib/labels";
import { formatMoney } from "@/lib/format";
import { whatsappLink } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuantityInput } from "./quantity";
import { useStore } from "./store-state";
import { WhatsAppIcon } from "./whatsapp-button";
import { flyToTarget } from "@/components/motion/fly-to-cart";

export function BuyBox({ product, preview = false }: { product: CatalogProduct; preview?: boolean }) {
  const { addToCart, addToQuote, notify } = useStore();
  const [qty, setQty] = useState(1);
  const avail = availabilityLabel(product.availability, product.saleMode);
  const direct = product.saleMode === "direct" && product.price != null;
  const soldOut = direct && product.availability === "out_of_stock";
  const snapshot = { name: product.name, sku: product.sku, slug: product.slug, imageUrl: product.imageUrl, price: product.price, currency: product.currency };
  const wa = whatsappLink(`Hola, me interesa el repuesto ${product.name} (SKU ${product.sku}).`);

  return (
    <div className="rounded-xl border border-steel-150 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className={direct ? "eyebrow" : "eyebrow !text-steel-500"}>{direct ? "Compra directa" : "Solicitud de cotización"}</span>
        <Badge tone={avail.tone} dot>{avail.label}</Badge>
      </div>

      {direct ? (
        <div className="mt-4">
          <p className="text-[34px] leading-none font-semibold tracking-tight text-ink tabular-nums">{formatMoney(product.price, product.currency)}</p>
          <p className="mt-2 text-[12.5px] text-steel-500">Precio unitario en {product.currency}. Impuestos y envío se confirman con su pedido.</p>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-[22px] leading-tight font-semibold text-ink">Precio bajo cotización</p>
          <p className="mt-2 text-[13px] leading-relaxed text-steel-500">Este repuesto requiere validación técnica o condiciones especiales. Agréguelo a su lista y le enviaremos una cotización formal.</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <QuantityInput value={qty} onChange={setQty} />
        {direct ? (
          <Button
            size="lg"
            className="min-w-0 flex-1"
            disabled={soldOut || preview}
            onClick={() => {
              addToCart(product.id, qty, snapshot);
              flyToTarget(document.querySelector("[data-gallery-main]"), "cart");
              notify(`${qty} × ${product.name} agregado al carrito`, "/carrito", "Ver carrito");
            }}
          >
            <ShoppingCart className="size-4" /> {soldOut ? "Agotado" : "Agregar al carrito"}
          </Button>
        ) : (
          <Button
            size="lg"
            variant="dark"
            className="min-w-0 flex-1"
            disabled={preview}
            onClick={() => {
              addToQuote(product.id, qty, snapshot);
              flyToTarget(document.querySelector("[data-gallery-main]"), "quote");
              notify("Agregado a su lista de cotización", "/cotizacion", "Ver lista");
            }}
          >
            <ClipboardList className="size-4" /> Agregar a cotización
          </Button>
        )}
      </div>

      {direct && (
        <button
          type="button"
          disabled={preview}
          onClick={() => {
            addToQuote(product.id, qty, snapshot);
            notify("Agregado a su lista de cotización", "/cotizacion", "Ver lista");
          }}
          className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-climb-700 hover:underline disabled:opacity-50"
        >
          <ClipboardList className="size-3.5" /> ¿Necesita volumen o condiciones especiales? Cotizar
        </button>
      )}

      {soldOut && (
        <p className="mt-4 flex gap-2 rounded-md bg-steel-50 p-3 text-[13px] text-steel-600">
          <Info className="mt-0.5 size-4 shrink-0 text-climb-600" /> Sin unidades disponibles en este momento. Puede solicitarlo por cotización y le informaremos el tiempo de reposición.
        </p>
      )}

      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center justify-center gap-2 rounded-md border border-steel-150 py-2.5 text-[13.5px] font-medium text-steel-700 transition-colors hover:border-steel-300 hover:text-ink">
          <WhatsAppIcon className="size-4 text-[#1f9e5a]" /> Consultar con un asesor
        </a>
      )}
      {preview && <p className="mt-4 text-center text-[12px] text-warn-600">Vista previa: los botones están deshabilitados.</p>}
    </div>
  );
}
