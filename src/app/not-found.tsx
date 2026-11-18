import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="blueprint flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Link href="/"><Logo /></Link>
      <p className="mt-12 font-mono text-[12px] tracking-[0.2em] text-climb-600">ERROR 404</p>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">No encontramos esta página</h1>
      <p className="mt-3 max-w-md text-steel-600">Es posible que el repuesto ya no esté publicado o que el enlace haya cambiado.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/catalogo" className="inline-flex h-10 items-center rounded-md bg-climb-600 px-4 text-sm font-medium text-white hover:bg-climb-700">Ir al catálogo</Link>
        <Link href="/cotizacion" className="inline-flex h-10 items-center rounded-md border border-steel-200 bg-white px-4 text-sm font-medium text-ink hover:bg-steel-50">Solicitar una pieza</Link>
      </div>
    </div>
  );
}
