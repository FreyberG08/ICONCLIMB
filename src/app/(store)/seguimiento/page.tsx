import type { Metadata } from "next";
import { TrackingForm } from "@/components/store/tracking-form";

export const metadata: Metadata = { title: "Seguimiento de pedidos y cotizaciones", description: "Consulte el estado de su pedido o solicitud de cotización con su número de referencia." };

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  return (
    <div className="container-x max-w-4xl py-10 lg:py-14">
      <p className="eyebrow">Seguimiento</p>
      <h1 className="mt-2 text-[30px] font-semibold sm:text-[36px]">Estado de su solicitud</h1>
      <p className="mt-2 text-[15px] text-steel-600">Ingrese el número de referencia que recibió y el correo electrónico con el que registró la solicitud.</p>
      <div className="mt-8">
        <TrackingForm initialNumber={n?.slice(0, 30)} />
      </div>
    </div>
  );
}
