import type { Metadata } from "next";
import { CartView } from "@/components/store/cart-view";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-x py-10 lg:py-14">
      <p className="eyebrow">Compra directa</p>
      <h1 className="mt-2 text-[30px] font-semibold sm:text-[36px]">Carrito</h1>
      <div className="mt-8">
        <CartView />
      </div>
    </div>
  );
}
