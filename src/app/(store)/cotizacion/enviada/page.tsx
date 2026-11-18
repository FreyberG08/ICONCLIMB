import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Solicitud enviada", robots: { index: false } };

export default async function QuoteSent({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  const number = n && /^ICN-C\d{4}-\d{5}$/.test(n) ? n : null;
  return (
    <div className="container-x max-w-2xl py-16 text-center lg:py-24">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-climb-50 text-climb-600 ring-8 ring-climb-50/50"><ClipboardCheck className="size-7" /></span>
      <h1 className="mt-6 text-[30px] font-semibold sm:text-[36px]">Solicitud recibida</h1>
      {number && (
        <p className="mt-4">
          <span className="text-sm text-steel-500">Número de referencia</span>
          <span className="mt-1 block font-mono text-2xl font-semibold tracking-wide text-ink">{number}</span>
        </p>
      )}
      <p className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-steel-600">
        Nuestro equipo revisará las piezas solicitadas, validará la información técnica y le enviará una cotización formal. Guarde su número de referencia para consultar el estado.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <LinkButton href={`/seguimiento${number ? `?n=${number}` : ""}`}>Consultar estado</LinkButton>
        <LinkButton href="/catalogo" variant="outline">Volver al catálogo</LinkButton>
      </div>
    </div>
  );
}
