import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, ClipboardList, FileText, Headset, PackageSearch, ShieldCheck, ShoppingCart, Truck, Wrench } from "lucide-react";
import { getPublicRepo } from "@/lib/data";
import { site, whatsappLink } from "@/lib/config";
import { SearchBox } from "@/components/store/search-box";
import { HeroVisual } from "@/components/store/hero-visual";
import { ProductGrid } from "@/components/store/product-card";
import { CategoryIcon } from "@/components/store/category-icon";
import { WhatsAppIcon } from "@/components/store/whatsapp-button";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui/misc";

export const revalidate = 60;

export default async function HomePage() {
  const repo = getPublicRepo();
  const [categories, featured, arrivals] = await Promise.all([
    repo.listCategories(),
    repo.listFeatured(8),
    repo.listNewArrivals(8),
  ]);
  const top = categories.filter((c) => !c.parentId);
  const wa = whatsappLink("Hola, necesito asesoría para identificar un repuesto de ascensor.");
  const featuredIds = new Set(featured.map((p) => p.id));
  const newOnes = arrivals.filter((p) => !featuredIds.has(p.id)).slice(0, 4);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-steel-150 bg-gradient-to-b from-white to-steel-50">
        <div className="blueprint absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_70%)]" aria-hidden="true" />
        <div className="container-x relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:gap-8 lg:py-24">
          <div className="min-w-0 lg:col-span-7 animate-fade-up">
            <p className="eyebrow flex items-center gap-2">
              <span className="inline-block h-px w-6 bg-climb-500" aria-hidden="true" />
              Repuestos para transporte vertical
            </p>
            <h1 className="mt-5 text-[40px] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-[56px] lg:text-[68px]">
              La pieza correcta.
              <span className="block text-climb-600">En el momento indicado.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-steel-600">
              Componentes electrónicos, piezas mecánicas y accesorios para ascensores. Compre en línea con precio
              autorizado o solicite una cotización técnica, con el respaldo de {site.legalName}.
            </p>
            <div className="mt-8 max-w-xl">
              <SearchBox size="lg" placeholder="SKU, referencia original, marca o nombre…" />
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-wide text-steel-500">
                <span>BUSQUE POR</span>
                {["Código SKU", "Referencia original", "Marca", "Modelo"].map((t) => (
                  <span key={t} className="rounded border border-steel-200 bg-white px-1.5 py-0.5 text-steel-600">{t}</span>
                ))}
              </p>
            </div>
            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton href="/catalogo" size="lg">
                Explorar catálogo <ArrowRight className="size-4" aria-hidden="true" />
              </LinkButton>
              <LinkButton href="/cotizacion" size="lg" variant="outline">
                <ClipboardList className="size-4" aria-hidden="true" /> Solicitar cotización
              </LinkButton>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative mx-auto aspect-[44/52] max-w-[440px] overflow-hidden rounded-xl border border-steel-150 bg-white shadow-[var(--shadow-raised)]">
              {site.heroImageUrl ? (
                <Image src={site.heroImageUrl} alt="Repuestos de ascensor ICON" fill priority sizes="(min-width: 1024px) 440px, 90vw" className="object-cover" />
              ) : (
                <HeroVisual />
              )}
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-md border border-steel-150 bg-white/90 px-3 py-2 backdrop-blur">
                <span className="font-mono text-[10px] tracking-[0.14em] text-steel-500">ICON · CLIMB PARTS</span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-ok-600">
                  <span className="size-1.5 animate-pulse rounded-full bg-ok-600" aria-hidden="true" /> CATÁLOGO EN LÍNEA
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Propuesta de valor */}
        <div className="relative border-t border-steel-150 bg-white/70 backdrop-blur">
          <div className="container-x grid grid-cols-2 divide-steel-150 lg:grid-cols-4 lg:divide-x">
            {[
              { icon: ShoppingCart, title: "Compra directa", text: "Precio autorizado y disponibilidad visible." },
              { icon: ClipboardList, title: "Cotización técnica", text: "Para piezas especiales o que requieren validación." },
              { icon: BadgeCheck, title: "Compatibilidad verificada", text: "Solo publicamos compatibilidades revisadas." },
              { icon: Headset, title: "Asesoría directa", text: "Un especialista le acompaña en la selección." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3 px-1 py-5 lg:px-6">
                <Icon className="mt-0.5 size-5 shrink-0 text-climb-600" strokeWidth={1.6} aria-hidden="true" />
                <div>
                  <p className="text-[14px] font-semibold text-ink">{title}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-steel-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="container-x py-20 lg:py-24" aria-labelledby="cat-title">
        <SectionHeading
          eyebrow="Categorías"
          title={<span id="cat-title">Encuentre la pieza por sistema</span>}
          description="Una clasificación pensada para técnicos y administradores de edificios. Cada categoría agrupa repuestos con fichas técnicas y fotografías."
          action={<LinkButton href="/catalogo" variant="ghost">Ver catálogo completo <ArrowRight className="size-4" /></LinkButton>}
        />
        <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-steel-150 bg-steel-150 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((c, i) => (
            <Link
              key={c.id}
              href={`/catalogo?categoria=${c.slug}`}
              className="group relative flex items-start gap-4 bg-white p-6 transition-colors hover:bg-steel-25"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-climb-50 text-climb-600 ring-1 ring-climb-100 transition-colors group-hover:bg-climb-600 group-hover:text-white">
                <CategoryIcon slug={c.slug} className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[15.5px] font-semibold text-ink">{c.name}</span>
                  <span className="font-mono text-[11px] text-steel-400">{String(i + 1).padStart(2, "0")}</span>
                </span>
                {c.description && <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-steel-500">{c.description}</span>}
                <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-climb-700">
                  {c.productCount ? `${c.productCount} ${c.productCount === 1 ? "producto" : "productos"}` : "Explorar"}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* DESTACADOS */}
      <section className="border-y border-steel-150 bg-steel-50 py-20 lg:py-24" aria-labelledby="feat-title">
        <div className="container-x">
          <SectionHeading
            eyebrow="Destacados"
            title={<span id="feat-title">Repuestos destacados</span>}
            description="Selección de piezas de alta rotación y componentes recomendados por nuestro equipo técnico."
            action={<LinkButton href="/catalogo" variant="outline">Ver todos <ArrowRight className="size-4" /></LinkButton>}
          />
          <div className="mt-10">
            {featured.length ? (
              <ProductGrid products={featured} />
            ) : (
              <EmptyState icon={<PackageSearch className="size-5" />} title="Catálogo en construcción" description="Estamos fotografiando y documentando nuestro inventario. Mientras tanto, solicite su repuesto y un asesor le responderá." action={<LinkButton href="/cotizacion">Solicitar cotización</LinkButton>} />
            )}
          </div>
        </div>
      </section>

      {/* CÓMO COMPRAR */}
      <section id="como-comprar" className="container-x scroll-mt-24 py-20 lg:py-24" aria-labelledby="how-title">
        <SectionHeading
          eyebrow="Cómo comprar"
          title={<span id="how-title">Dos caminos, un mismo respaldo técnico</span>}
          description="Cada producto indica su modalidad. Puede combinar ambas: compre lo disponible y cotice las piezas especiales."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {[
            {
              icon: ShoppingCart,
              tag: "Compra directa",
              title: "Productos con precio autorizado",
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
              steps: [
                ["Arme su lista", "Agregue las piezas y cantidades que necesita."],
                ["Describa su equipo", "Marca, modelo del ascensor y observaciones."],
                ["Reciba un número de referencia", "Para dar seguimiento a su solicitud."],
                ["Cotización formal", "Nuestro equipo valida compatibilidad y le envía la propuesta."],
              ],
              cta: { href: "/catalogo?modo=quote", label: "Ver productos para cotizar" },
            },
          ].map((track) => (
            <div key={track.tag} className="relative overflow-hidden rounded-xl border border-steel-150 bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-md bg-ink text-white"><track.icon className="size-5" strokeWidth={1.6} /></span>
                <div>
                  <p className="eyebrow">{track.tag}</p>
                  <h3 className="text-lg font-semibold">{track.title}</h3>
                </div>
              </div>
              <ol className="mt-8 space-y-0">
                {track.steps.map(([t, d], i) => (
                  <li key={t} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < track.steps.length - 1 && <span className="absolute top-8 left-[15px] h-[calc(100%-32px)] w-px bg-steel-200" aria-hidden="true" />}
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-steel-200 bg-white font-mono text-[12px] font-medium text-climb-700">{i + 1}</span>
                    <div className="pt-1">
                      <p className="text-[14.5px] font-medium text-ink">{t}</p>
                      <p className="mt-0.5 text-[13.5px] text-steel-500">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link href={track.cta.href} className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-climb-700 hover:underline">
                {track.cta.label} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[13px] text-steel-500">
          La pasarela de pago en línea se habilitará próximamente. Hoy, su pedido queda registrado y reservado; la forma de pago se confirma con un asesor.
        </p>
      </section>

      {/* NUEVOS INGRESOS */}
      {newOnes.length > 0 && (
        <section className="container-x pb-20 lg:pb-24" aria-labelledby="new-title">
          <SectionHeading eyebrow="Nuevos ingresos" title={<span id="new-title">Recién incorporados al catálogo</span>} action={<LinkButton href="/catalogo?orden=newest" variant="ghost">Ver más recientes <ArrowRight className="size-4" /></LinkButton>} />
          <div className="mt-10">
            <ProductGrid products={newOnes} />
          </div>
        </section>
      )}

      {/* RESPALDO CLIMB */}
      <section id="respaldo" className="scroll-mt-24 bg-climb-950 text-white" aria-labelledby="climb-title">
        <div className="container-x grid gap-12 py-20 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-5">
            <p className="eyebrow !text-climb-300">Respaldo</p>
            <h2 id="climb-title" className="mt-3 text-[30px] leading-tight font-semibold !text-white sm:text-[38px]">
              Una iniciativa de {site.legalName}
            </h2>
            <p className="mt-5 text-[15.5px] leading-relaxed text-white/70">
              ICON nace dentro de una empresa especializada en soluciones de transporte vertical. Detrás de cada ficha
              hay personas que conocen los equipos, revisan la información técnica y responden por lo que se publica.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-2 lg:col-span-7">
            {[
              { icon: ShieldCheck, title: "Información revisada", text: "Ningún repuesto se publica sin revisión. Las compatibilidades solo se muestran cuando han sido verificadas." },
              { icon: Wrench, title: "Criterio técnico", text: "Para piezas especiales validamos referencia, modelo del equipo y aplicación antes de cotizar." },
              { icon: FileText, title: "Fichas y documentación", text: "Fotografías, características y documentación técnica descargable cuando está autorizada." },
              { icon: Truck, title: "Inventario centralizado", text: "Existencias controladas con reservas al registrar pedidos, para evitar ventas sin respaldo." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-climb-950 p-6 sm:p-7">
                <Icon className="size-5 text-climb-300" strokeWidth={1.6} aria-hidden="true" />
                <p className="mt-4 text-[15px] font-semibold">{title}</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/60">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ASESORÍA */}
      <section className="container-x pt-20 lg:pt-24" aria-labelledby="help-title">
        <div className="relative overflow-hidden rounded-xl border border-steel-150 bg-gradient-to-br from-white to-climb-50 p-8 sm:p-12">
          <div className="blueprint absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_60%)]" aria-hidden="true" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="eyebrow">Asesoría</p>
              <h2 id="help-title" className="mt-3 text-[28px] leading-tight font-semibold sm:text-[34px]">¿No encuentra su repuesto?</h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-steel-600">
                Envíenos la referencia, una descripción o el modelo de su equipo. Un especialista le ayudará a identificar la pieza correcta.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-md bg-[#1f9e5a] px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#1a8a4e]">
                  <WhatsAppIcon className="size-5" /> Escribir por WhatsApp
                </a>
              )}
              <LinkButton href="/cotizacion" size="lg" variant={wa ? "outline" : "primary"}>
                <ClipboardList className="size-4" /> Solicitar cotización
              </LinkButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
