import type { Metadata } from "next";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata: Metadata = { title: "Registrar pedido", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-x py-10 lg:py-14">
      <p className="eyebrow">Paso 2 de 2</p>
      <h1 className="mt-2 text-[30px] font-semibold sm:text-[36px]">Registrar pedido</h1>
      <div className="mt-8">
        <CheckoutForm />
      </div>
    </div>
  );
}
