import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, ClipboardList, FileText, Headset, PackageSearch, ShieldCheck, ShoppingCart, Truck, Wrench } from "lucide-react";
import { getPublicRepo } from "@/lib/data";
import { site, whatsappLink } from "@/lib/config";
import { SearchBox } from "@/components/store/search-box";
import { HeroVisual } from "@/components/store/hero-visual";
import { ProductGrid } from "@/components/store/product-card";
import { WhatsAppIcon } from "@/components/store/whatsapp-button";
import { EmptyState } from "@/components/ui/misc";
import { HeroStage } from "@/components/motion/hero-stage";
import { ElevatorJourney } from "@/components/motion/elevator-journey";
import { FloorIndicator } from "@/components/motion/floor-indicator";
import { Marquee } from "@/components/motion/marquee";

export const revalidate = 60;

function Heading({ eyebrow, title, description, action, dark = false }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode; dark?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-2xl">
        <p className={`eyebrow mb-4 flex items-center gap-2 ${dark ? "!text-climb-300" : ""}`} data-reveal>
          <span className="inline-block h-px w-8 bg-current" aria-hidden="true" /> {eyebrow}
        </p>
        <h2 className={`text-[34px] leading-[1.02] font-semibold tracking-[-0.03em] sm:text-[52px] ${dark ? "!text-white" : ""}`} data-split="words">
          {title}
        </h2>
        {description && <p className={`mt-5 text-[16px] leading-relaxed ${dark ? "text-white/60" : "text-steel-600"}`} data-reveal data-delay="0.15">{description}</p>}
      </div>
      {action && <div data-reveal data-delay="0.2">{action}</div>}
    </div>
  );
}

function CtaLink({ href, children, dark }: { href: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <Link href={href} data-magnetic className={`btn-sweep inline-flex h-12 items-center gap-2 rounded-full px-6 text-[14px] font-medium transition-colors ${dark ? "border border-white/20 text-white" : "border border-steel-200 bg-white text-ink hover:text-white"}`}>
      {children}
    </Link>
  );
}

export default async function HomePage() {
  const repo = getPublicRepo();
  const [categories, featured, arrivals] = await Promise.all([repo.listCategories(), repo.listFeatured(8), repo.listNewArrivals(8)]);
  const top = categories.filter((c) => !c.parentId);
  const wa = whatsappLink("Hola, necesito asesoría para identificar un repuesto de ascensor.");
  const featuredIds = new Set(featured.map((p) => p.id));
  const newOnes = arrivals.filter((p) => !featuredIds.has(p.id)).slice(0, 4);

  const copy = (
    <>
      <p data-hero-eyebrow data-hero-hide className="eyebrow flex items-center gap-2">
        <span className="inline-block h-px w-8 bg-climb-500" aria-hidden="true" />
        Repuestos para transporte vertical
      </p>
      <h1 data-hero-title data-hero-hide className="mt-6 text-[44px] leading-[0.98] font-semibold tracking-[-0.045em] sm:text-[64px] lg:text-[84px]">
        La pieza correcta. <span className="block text-climb-600">En el momento indicado.</span>
      </h1>
      <p data-hero-text data-hero-hide className="mt-7 max-w-xl text-[17px] leading-relaxed text-steel-600">
        Componentes electrónicos, piezas mecánicas y accesorios para ascensores. Compre en línea con precio autorizado o solicite una
        cotización técnica, con respaldo técnico especializado.
      </p>
      <div data-hero-search data-hero-hide className="mt-9 max-w-xl">
        <SearchBox size="lg" placeholder="SKU, referencia original, marca o nombre…" />
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-wide text-steel-500">
          <span>BUSQUE POR</span>
          {["Código SKU", "Referencia original", "Marca", "Modelo"].map((t) => (
            <span key={t} className="rounded border border-steel-200 bg-white px-1.5 py-0.5 text-steel-600">{t}</span>
          ))}
        </p>
      </div>
      <div data-hero-cta data-hero-hide className="mt-10 flex flex-wrap gap-3">
        <Link href="/catalogo" data-magnetic className="btn-sweep inline-flex h-13 items-center gap-2 rounded-full bg-climb-600 px-7 text-[15px] font-medium text-white shadow-[0_14px_30px_-12px_rgb(23_77_159/0.7)]">
          Explorar catálogo <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <Link href="/cotizacion" data-magnetic className="btn-sweep inline-flex h-13 items-center gap-2 rounded-full border border-steel-200 bg-white px-7 text-[15px] font-medium text-ink transition-colors hover:text-white">
          <ClipboardList className="size-4" aria-hidden="true" /> Solicitar cotización
        </Link>
      </div>
    </>
  );

  const visual = (
    <div className="relative mx-auto max-w-[460px]">
      <div data-hero-visual data-hero-hide className="relative aspect-[44/52] overflow-hidden rounded-2xl border border-steel-150 bg-white shadow-[0_50px_100px_-40px_rgb(10_33_73/0.45)] [transform-style:preserve-3d]">
        {site.heroImageUrl ? (
          <Image src={site.heroImageUrl} alt="Repuestos de ascensor AICON" fill priority sizes="(min-width: 1024px) 460px, 90vw" className="object-cover" />
        ) : (
          <HeroVisual />
        )}
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-md border border-steel-150 bg-white/90 px-3 py-2 backdrop-blur">
          <span className="font-mono text-[10px] tracking-[0.14em] text-steel-500">AICON · REPUESTOS</span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-ok-600">
            <span className="size-1.5 animate-pulse rounded-full bg-ok-600" aria-hidden="true" /> CATÁLOGO EN LÍNEA
          </span>
        </div>
      </div>
      {/* Etiquetas flotantes */}
      <div data-hero-chip data-hero-hide className="hero-chip absolute top-[14%] -left-4 hidden rounded-xl border border-steel-150 bg-white/95 px-4 py-3 backdrop-blur sm:block lg:-left-14">
        <p className="font-mono text-[10px] tracking-wider text-steel-400">SKU</p>
        <p className="font-mono text-[13px] font-semibold text-ink">VERIFICADO</p>
      </div>
      <div data-hero-chip data-hero-hide className="hero-chip absolute top-[46%] -right-3 hidden items-center gap-2 rounded-xl border border-steel-150 bg-white/95 px-4 py-3 backdrop-blur sm:flex lg:-right-10">
        <BadgeCheck className="size-5 text-ok-600" />
        <div>
          <p className="text-[12.5px] font-semibold text-ink">Compatibilidad</p>
          <p className="text-[11px] text-steel-500">revisada por técnicos</p>
        </div>
      </div>
      <div data-hero-chip data-hero-hide className="hero-chip absolute bottom-[16%] -left-2 hidden items-center gap-2 rounded-full bg-climb-950 px-4 py-2.5 text-white sm:flex lg:-left-10">
        <ShoppingCart className="size-4 text-climb-300" />
        <span className="text-[12.5px] font-medium">Compra o cotiza en línea</span>
      </div>
    </div>
  );

  const strip = (
    <div className="relative border-t border-steel-150 bg-white/70 backdrop-blur">
      <div data-hero-strip className="container-x grid grid-cols-2 divide-steel-150 lg:grid-cols-4 lg:divide-x">
        {[
          { icon: ShoppingCart, title: "Compra directa", text: "Precio autorizado y disponibilidad visible." },
          { icon: ClipboardList, title: "Cotización técnica", text: "Para piezas especiales o que requieren validación." },
          { icon: BadgeCheck, title: "Compatibilidad verificada", text: "Solo publicamos compatibilidades revisadas." },
          { icon: Headset, title: "Asesoría directa", text: "Un especialista le acompaña en la selección." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} data-hero-hide className="flex gap-3 px-1 py-5 lg:px-6">
            <Icon className="mt-0.5 size-5 shrink-0 text-climb-600" strokeWidth={1.6} aria-hidden="true" />
            <div>
              <p className="text-[14px] font-semibold text-ink">{title}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-steel-500">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <FloorIndicator />
      <HeroStage copy={copy} visual={visual} strip={strip} />

      <Marquee items={["Tarjetas electrónicas", "Variadores", "Botoneras", "Operadores de puerta", "Sensores de seguridad", "Motores y frenos", "Componentes mecánicos"]} />

      <ElevatorJourney stops={top.map((c) => ({ name: c.name, slug: c.slug, description: c.description, productCount: c.productCount }))} />

      {/* DESTACADOS */}
      <section data-floor="02" data-floor-label="Destacados" className="relative overflow-hidden bg-steel-50 py-24 lg:py-32" aria-label="Repuestos destacados">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-climb-100/60 blur-[120px]" aria-hidden="true" data-parallax="0.25" />
        <div className="container-x relative">
          <Heading
            eyebrow="Destacados"
            title="Repuestos destacados"
            description="Selección de piezas de alta rotación y componentes recomendados por nuestro equipo técnico."
            action={<CtaLink href="/catalogo">Ver todo el catálogo <ArrowRight className="size-4" /></CtaLink>}
          />
          <div className="mt-14">
            {featured.length ? (
              <ProductGrid products={featured} />
            ) : (
              <EmptyState icon={<PackageSearch className="size-5" />} title="Catálogo en construcción" description="Estamos fotografiando y documentando nuestro inventario. Mientras tanto, solicite su repuesto y un asesor le responderá." />
            )}
          </div>
        </div>
      </section>

      {/* CÓMO COMPRAR */}
      <section id="como-comprar" data-floor="03" data-floor-label="Cómo comprar" className="container-x scroll-mt-24 py-24 lg:py-32" aria-label="Cómo comprar">
        <Heading eyebrow="Cómo comprar" title="Dos caminos, un mismo respaldo técnico" description="Cada producto indica su modalidad. Puede combinar ambas: compre lo disponible y cotice las piezas especiales." />
        <div className="mt-16 grid gap-6 lg:grid-cols-2" data-stagger>
          {[
            {
              icon: ShoppingCart,
              tag: "Compra directa",
              title: "Productos con precio autorizado",
              dark: false,
              steps: [
                ["Busque", "Por código, referencia o categoría."],
                ["Agregue al carrito", "Seleccione cantidades según la disponibilidad."],
                ["Registre su pedido", "Validamos precio y existencias en el servidor y reservamos las unidades."],
                ["Confirmación", "Un asesor confirma forma de pago y entrega."],
              ],
              cta: { href: "/catalogo?modo=direct", label: "Ver productos de compra directa" },
            },
            {
              icon: ClipboardList,
              tag: "Cotización",
              title: "Repuestos especiales o con validación técnica",
              dark: true,
              steps: [
                ["Arme su lista", "Agregue las piezas y cantidades que necesita."],
                ["Describa su equipo", "Marca, modelo del ascensor y observaciones."],
                ["Reciba un número de referencia", "Para dar seguimiento a su solicitud."],
                ["Cotización formal", "Nuestro equipo valida compatibilidad y le envía la propuesta."],
              ],
              cta: { href: "/catalogo?modo=quote", label: "Ver productos para cotizar" },
            },
          ].map((track) => (
            <div key={track.tag} data-spotlight={track.dark ? "" : undefined} className={`relative overflow-hidden rounded-3xl p-7 sm:p-10 ${track.dark ? "bg-climb-950 text-white" : "border border-steel-150 bg-white"}`}>
              <div className="relative flex items-center gap-4">
                <span className={`grid size-12 place-items-center rounded-xl ${track.dark ? "bg-climb-500/20 text-climb-300" : "bg-ink text-white"}`}><track.icon className="size-5" strokeWidth={1.6} /></span>
                <div>
                  <p className={`eyebrow ${track.dark ? "!text-climb-300" : ""}`}>{track.tag}</p>
                  <h3 className={`text-[20px] font-semibold ${track.dark ? "!text-white" : ""}`}>{track.title}</h3>
                </div>
              </div>
              <ol className="relative mt-10">
                <span className={`absolute top-4 bottom-4 left-[17px] w-px ${track.dark ? "bg-white/10" : "bg-steel-200"}`} aria-hidden="true" />
                <span data-scrub-line className="absolute top-4 bottom-4 left-[17px] w-px origin-top bg-climb-500" aria-hidden="true" />
                {track.steps.map(([t, d], i) => (
                  <li key={t} className="relative flex gap-5 pb-8 last:pb-0">
                    <span className={`relative grid size-9 shrink-0 place-items-center rounded-full border font-mono text-[12px] font-medium ${track.dark ? "border-white/15 bg-climb-950 text-climb-300" : "border-steel-200 bg-white text-climb-700"}`}>{i + 1}</span>
                    <div className="pt-1.5">
                      <p className={`text-[15.5px] font-medium ${track.dark ? "text-white" : "text-ink"}`}>{t}</p>
                      <p className={`mt-1 text-[14px] ${track.dark ? "text-white/55" : "text-steel-500"}`}>{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link href={track.cta.href} className={`relative mt-10 inline-flex items-center gap-1.5 text-sm font-medium hover:underline ${track.dark ? "text-climb-300" : "text-climb-700"}`}>
                {track.cta.label} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-[13px] text-steel-500" data-reveal>
          La pasarela de pago en línea se habilitará próximamente. Hoy, su pedido queda registrado y reservado; la forma de pago se confirma con un asesor.
        </p>
      </section>

      {/* NUEVOS INGRESOS */}
      {newOnes.length > 0 && (
        <section data-floor="04" data-floor-label="Novedades" className="container-x pb-24 lg:pb-32" aria-label="Nuevos ingresos">
          <Heading eyebrow="Nuevos ingresos" title="Recién incorporados al catálogo" action={<CtaLink href="/catalogo?orden=newest">Ver más recientes <ArrowRight className="size-4" /></CtaLink>} />
          <div className="mt-14">
            <ProductGrid products={newOnes} />
          </div>
        </section>
      )}

      <Marquee dark items={["La pieza correcta", "En el momento indicado", "Respaldo técnico especializado", "Compatibilidad verificada"]} />

      {/* POR QUÉ AICON */}
      <section id="respaldo" data-floor="05" data-floor-label="Por qué AICON" data-spotlight="" className="scroll-mt-24 overflow-hidden bg-climb-950 text-white" aria-label="Por qué AICON">
        <div className="journey-grid absolute inset-0" aria-hidden="true" />
        <div className="container-x relative grid gap-14 py-24 lg:grid-cols-12 lg:py-32">
          <div className="lg:col-span-5">
            <Heading dark eyebrow="Por qué AICON" title="Especialistas en repuestos para ascensores" />
            <p className="mt-6 text-[16px] leading-relaxed text-white/65" data-reveal>
              AICON es una tienda dedicada exclusivamente al transporte vertical. Detrás de cada ficha hay personas que conocen los
              equipos, revisan la información técnica y responden por lo que se publica.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7" data-stagger>
            {[
              { icon: ShieldCheck, title: "Información revisada", text: "Ningún repuesto se publica sin revisión. Las compatibilidades solo se muestran cuando han sido verificadas." },
              { icon: Wrench, title: "Criterio técnico", text: "Para piezas especiales validamos referencia, modelo del equipo y aplicación antes de cotizar." },
              { icon: FileText, title: "Fichas y documentación", text: "Fotografías, características y documentación técnica descargable cuando está autorizada." },
              { icon: Truck, title: "Inventario centralizado", text: "Existencias controladas con reservas al registrar pedidos, para evitar ventas sin respaldo." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} data-tilt className="group relative rounded-2xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm transition-colors hover:border-climb-300/30 hover:bg-white/[0.07]">
                <span className="grid size-11 place-items-center rounded-xl bg-climb-500/15 text-climb-300 ring-1 ring-climb-300/20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <Icon className="size-5" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <p className="mt-6 text-[16px] font-semibold">{title}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-white/55">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ASESORÍA */}
      <section data-floor="06" data-floor-label="Asesoría" className="container-x pt-24 lg:pt-32" aria-label="Asesoría">
        <div data-reveal className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-climb-600 via-climb-700 to-climb-900 p-10 text-white sm:p-16">
          <div className="hero-aurora pointer-events-none absolute -right-40 -bottom-60 h-[520px] w-[520px] rounded-full opacity-70" aria-hidden="true" />
          <div className="door-grid absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow !text-climb-200">Asesoría</p>
              <h2 className="mt-4 text-[36px] leading-[1.02] font-semibold tracking-[-0.03em] !text-white sm:text-[56px]" data-split="words">¿No encuentra su repuesto?</h2>
              <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-white/75" data-reveal>
                Envíenos la referencia, una descripción o el modelo de su equipo. Un especialista le ayudará a identificar la pieza correcta.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" data-magnetic className="inline-flex h-14 items-center gap-2 rounded-full bg-[#1f9e5a] px-7 text-[15px] font-medium text-white shadow-[0_18px_40px_-14px_rgb(0_0_0/0.5)]">
                  <WhatsAppIcon className="size-5" /> Escribir por WhatsApp
                </a>
              )}
              <Link href="/cotizacion" data-magnetic className="inline-flex h-14 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-medium text-climb-900 shadow-[0_18px_40px_-14px_rgb(0_0_0/0.5)] transition-transform hover:scale-[1.03]">
                <ClipboardList className="size-4" /> Solicitar cotización
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
