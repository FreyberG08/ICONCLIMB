import Link from "next/link";
import { isDemoMode } from "@/lib/config";

export function DemoBanner({ admin = false }: { admin?: boolean }) {
  if (!isDemoMode) return null;
  return (
    <div className="bg-warn-50 text-warn-600 border-b border-warn-600/15">
      <div className="container-x flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-[12.5px]">
        <span className="rounded bg-warn-600 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-white">MODO DEMOSTRACIÓN</span>
        <span>
          Productos de ejemplo y datos locales. Sin conexión a Supabase: no se procesan pedidos reales ni pagos.
          {!admin && <> <Link href="/admin" className="font-medium underline underline-offset-2">Ir al panel</Link></>}
        </span>
      </div>
    </div>
  );
}
