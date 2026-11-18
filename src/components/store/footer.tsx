import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { site, whatsappLink } from "@/lib/config";
import type { Category } from "@/lib/types";

export function Footer({ categories }: { categories: Category[] }) {
  const wa = whatsappLink("Hola, necesito asesoría sobre un repuesto para ascensor.");
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-climb-950 text-white">
      <div className="blueprint border-b border-white/5 [--tw-gradient-from:transparent]" style={{ backgroundImage: "linear-gradient(to right, rgb(255 255 255 / 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.03) 1px, transparent 1px)", backgroundSize: "32px 32px" }}>
        <div className="container-x grid gap-12 py-16 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo inverted />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
              {site.tagline} Repuestos y componentes para transporte vertical, con el respaldo técnico de {site.legalName}.
            </p>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-white/10 px-4 text-sm font-medium text-white ring-1 ring-white/15 transition-colors hover:bg-white/15">
                Asesoría por WhatsApp
              </a>
            )}
          </div>

          <div className="md:col-span-3">
            <h2 className="eyebrow !text-white/40">Categorías</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {categories.slice(0, 9).map((c) => (
                <li key={c.id}>
                  <Link href={`/catalogo?categoria=${c.slug}`} className="text-white/70 transition-colors hover:text-white">{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h2 className="eyebrow !text-white/40">Tienda</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/catalogo" className="text-white/70 hover:text-white">Catálogo completo</Link></li>
              <li><Link href="/catalogo?modo=direct" className="text-white/70 hover:text-white">Compra directa</Link></li>
              <li><Link href="/cotizacion" className="text-white/70 hover:text-white">Solicitar cotización</Link></li>
              <li><Link href="/seguimiento" className="text-white/70 hover:text-white">Seguimiento de solicitudes</Link></li>
              <li><Link href="/privacidad" className="text-white/70 hover:text-white">Privacidad de datos</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h2 className="eyebrow !text-white/40">Contacto</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              {site.phone && (
                <li className="flex gap-3"><Phone className="mt-0.5 size-4 shrink-0 text-white/40" aria-hidden="true" /><a href={`tel:${site.phone.replace(/\s/g, "")}`} className="hover:text-white">{site.phone}</a></li>
              )}
              {site.email && (
                <li className="flex gap-3"><Mail className="mt-0.5 size-4 shrink-0 text-white/40" aria-hidden="true" /><a href={`mailto:${site.email}`} className="hover:text-white">{site.email}</a></li>
              )}
              {site.address && (
                <li className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-white/40" aria-hidden="true" /><span>{site.address}</span></li>
              )}
              {site.hours && (
                <li className="flex gap-3"><Clock className="mt-0.5 size-4 shrink-0 text-white/40" aria-hidden="true" /><span>{site.hours}</span></li>
              )}
              {!site.phone && !site.email && !site.address && (
                <li className="text-white/50">Escríbanos mediante el formulario de cotización y un asesor le contactará.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
      <div className="container-x flex flex-col gap-2 py-6 text-[12px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} {site.legalName}. Todos los derechos reservados.</p>
        <p className="font-mono tracking-wider">ICON · CLIMB PARTS</p>
      </div>
    </footer>
  );
}
