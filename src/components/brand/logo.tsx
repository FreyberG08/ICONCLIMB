import { site } from "@/lib/config";
import { cn } from "@/lib/cn";

/**
 * Marca AICON.
 * Mientras no se entregue el logo oficial se muestra un rótulo tipográfico
 * PROVISIONAL (no es una versión del logo). Para usar el original, coloque el
 * archivo en /public/brand/ y defina NEXT_PUBLIC_LOGO_URL=/brand/icon-logo.svg
 */
export function Logo({ className, inverted = false, compact = false }: { className?: string; inverted?: boolean; compact?: boolean }) {
  if (site.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={site.logoUrl} alt={site.name} className={cn("h-8 w-auto", className)} />;
  }
  return (
    <span className={cn("inline-flex items-baseline gap-2.5 leading-none", className)} aria-label={site.name}>
      <span className={cn("text-[22px] font-semibold tracking-[0.22em]", inverted ? "text-white" : "text-ink")}>AICON</span>
      {!compact && (
        <span className={cn("hidden border-l pl-2.5 font-mono text-[10px] tracking-[0.16em] uppercase sm:inline", inverted ? "border-white/25 text-white/60" : "border-steel-200 text-steel-500")}>
          Repuestos para ascensores
        </span>
      )}
    </span>
  );
}
