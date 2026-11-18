import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pedido registrado", robots: { index: false } };

export default async function OrderConfirmed({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  const number = n && /^ICN-[PC]\d{4}-\d{5}$/.test(n) ? n : null;
  return (
    <div className="container-x max-w-2xl py-16 text-center lg:py-24">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-ok-50 text-ok-600 ring-8 ring-ok-50/50"><CircleCheck className="size-7" /></span>
      <h1 className="mt-6 text-[30px] font-semibold sm:text-[36px]">Pedido registrado</h1>
      {number && (
        <p className="mt-4">
          <span className="text-sm text-steel-500">Número de referencia</span>
          <span className="mt-1 block font-mono text-2xl font-semibold tracking-wide text-ink">{number}</span>
        </p>
      )}
      <p className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-steel-600">
        Reservamos las unidades de su pedido. Un asesor le contactará para confirmar disponibilidad, forma de pago y entrega.
        <strong className="mt-2 block font-medium text-ink">No se ha realizado ningún cobro.</strong>
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <LinkButton href={`/seguimiento${number ? `?n=${number}` : ""}`}>Consultar estado</LinkButton>
        <LinkButton href="/catalogo" variant="outline">Seguir explorando</LinkButton>
      </div>
    </div>
  );
}
