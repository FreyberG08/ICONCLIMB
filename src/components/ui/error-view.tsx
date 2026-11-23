"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

/** Pantalla de error recuperable: nunca deja la página en blanco y muestra el motivo. */
export function ErrorView({ error, reset, homeHref = "/", homeLabel = "Ir al inicio" }: { error: Error & { digest?: string }; reset: () => void; homeHref?: string; homeLabel?: string }) {
  useEffect(() => {
    console.error("[AICON]", error);
  }, [error]);
  const technical = error.digest ? `Código de referencia: ${error.digest}` : error.message;
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg rounded-xl border border-steel-150 bg-white p-8 text-center shadow-[var(--shadow-card)]">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-warn-50 text-warn-600"><TriangleAlert className="size-6" /></span>
        <h1 className="mt-5 text-xl font-semibold">Algo no salió como esperábamos</h1>
        <p className="mt-2 text-[14px] text-steel-600">La acción no se completó. Puede reintentar; si el problema continúa, envíe a soporte el detalle de abajo.</p>
        {technical && <p className="mt-4 rounded-md bg-steel-50 px-3 py-2 text-left font-mono text-[12px] break-words text-steel-600">{technical}</p>}
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={reset} className="inline-flex h-10 items-center gap-2 rounded-md bg-climb-600 px-4 text-sm font-medium text-white hover:bg-climb-700">
            <RotateCcw className="size-4" /> Reintentar
          </button>
          <Link href={homeHref} className="inline-flex h-10 items-center rounded-md border border-steel-200 px-4 text-sm font-medium text-ink hover:bg-steel-50">{homeLabel}</Link>
        </div>
      </div>
    </div>
  );
}
