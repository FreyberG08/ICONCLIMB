import type { Metadata } from "next";
import { QuoteView } from "@/components/store/quote-view";

export const metadata: Metadata = {
  title: "Solicitud de cotización",
  description: "Envíe su lista de repuestos para ascensores y reciba una cotización formal con validación técnica.",
};

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ pieza?: string }> }) {
  const { pieza } = await searchParams;
  return (
    <div className="container-x py-10 lg:py-14">
      <p className="eyebrow">Cotización</p>
      <h1 className="mt-2 text-[30px] font-semibold sm:text-[36px]">Solicitud de cotización</h1>
      <p className="mt-2 max-w-2xl text-[15px] text-steel-600">
        Para repuestos especiales, piezas que requieren validación técnica o compras por volumen. Revisamos cada solicitud y respondemos con una propuesta formal.
      </p>
      <div className="mt-8">
        <QuoteView initialPiece={pieza?.slice(0, 200)} />
      </div>
    </div>
  );
}
