"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { CategoryIcon } from "@/components/store/category-icon";
import { gsap, prefersReducedMotion } from "./effects";

interface Stop {
  name: string;
  slug: string;
  description: string | null;
  productCount?: number;
}

/**
 * "El recorrido": sección fijada donde la cabina baja por el hueco y en cada piso
 * aparece una categoría. En móvil se convierte en una lista con apariciones.
 */
export function ElevatorJourney({ stops }: { stops: Stop[] }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion() || stops.length < 2) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const shaft = el.querySelector<HTMLElement>("[data-shaft]")!;
      const cabin = el.querySelector<HTMLElement>("[data-cabin]")!;
      const panels = gsap.utils.toArray<HTMLElement>("[data-stop]", el);
      const ticks = gsap.utils.toArray<HTMLElement>("[data-tick]", el);
      const big = el.querySelector<HTMLElement>("[data-bignum]");
      const bar = el.querySelector<HTMLElement>("[data-progress]");
      const travel = () => shaft.clientHeight - cabin.clientHeight - 16;

      gsap.set(panels, { autoAlpha: 0, yPercent: 30 });
      gsap.set(panels[0], { autoAlpha: 1, yPercent: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${stops.length * window.innerHeight * 0.75}`,
          pin: true,
          scrub: 0.8,
          snap: { snapTo: 1 / (stops.length - 1), duration: { min: 0.25, max: 0.7 }, ease: "power2.inOut", delay: 0.05 },
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const i = Math.round(self.progress * (stops.length - 1));
            if (big) big.textContent = String(i + 1).padStart(2, "0");
            ticks.forEach((t, j) => t.classList.toggle("is-active", j === i));
          },
        },
      });
      tl.to(cabin, { y: travel, duration: stops.length - 1, ease: "none" }, 0);
      if (bar) tl.fromTo(bar, { scaleY: 0 }, { scaleY: 1, duration: stops.length - 1, ease: "none" }, 0);
      panels.forEach((p, i) => {
        if (i === 0) return;
        const t = i - 0.5;
        tl.to(panels[i - 1], { autoAlpha: 0, yPercent: -30, duration: 0.45 }, t - 0.2).fromTo(p, { autoAlpha: 0, yPercent: 30 }, { autoAlpha: 1, yPercent: 0, duration: 0.45 }, t + 0.05);
      });
    });
    mm.add("(max-width: 1023px)", () => {
      gsap.utils.toArray<HTMLElement>("[data-stop]", el).forEach((p) => {
        gsap.from(p, { autoAlpha: 0, y: 50, scale: 0.96, duration: 1, ease: "expo.out", scrollTrigger: { trigger: p, start: "top 90%", once: true } });
      });
    });
    return () => mm.revert();
  }, [stops.length]);

  return (
    <section ref={root} data-floor="01" data-floor-label="Sistemas" className="journey relative overflow-hidden bg-climb-950 text-white" aria-labelledby="journey-title">
      <div className="journey-grid absolute inset-0" aria-hidden="true" />
      <div className="container-x relative py-20 lg:flex lg:h-dvh lg:items-center lg:py-0">
        <div className="grid w-full gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-4">
            <p className="eyebrow !text-climb-300">El recorrido</p>
            <h2 id="journey-title" className="mt-4 text-[34px] leading-[1.05] font-semibold !text-white sm:text-[48px]" data-split="words">
              Un piso para cada sistema del ascensor
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/60" data-reveal>
              Baje por el hueco y descubra cómo organizamos los repuestos: de la electrónica de control a los consumibles de mantenimiento.
            </p>
            <div className="mt-10 hidden items-end gap-4 lg:flex">
              <span data-bignum className="font-mono text-[96px] leading-none font-semibold text-transparent tabular-nums [-webkit-text-stroke:1px_rgb(130_169_227/0.7)]">01</span>
              <span className="mb-3 font-mono text-[11px] tracking-[0.2em] text-white/40">/ {String(stops.length).padStart(2, "0")} PISOS</span>
            </div>
          </div>

          {/* Hueco con cabina (escritorio) */}
          <div className="relative hidden lg:col-span-2 lg:block">
            <div data-shaft className="relative mx-auto h-[68vh] w-[92px] rounded-md border border-white/15 bg-white/[0.03]">
              <div className="absolute inset-y-3 left-3 w-px bg-white/15" />
              <div className="absolute inset-y-3 right-3 w-px bg-white/15" />
              <div data-progress className="absolute inset-y-0 left-1/2 w-px origin-top -translate-x-1/2 bg-gradient-to-b from-climb-300 to-climb-500" />
              {stops.map((s, i) => (
                <div key={s.slug} data-tick className="journey-tick absolute -left-11 flex -translate-y-1/2 items-center gap-2" style={{ top: `calc(52px + (100% - 104px) * ${i / (stops.length - 1)})` }}>
                  <span className="font-mono text-[10px] tracking-wider text-white/35 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="h-px w-4 bg-white/25" />
                </div>
              ))}
              <div data-cabin className="absolute top-2 left-1/2 h-[88px] w-[70px] -translate-x-1/2 rounded-[4px] border border-climb-300/70 bg-gradient-to-b from-climb-700 to-climb-900 shadow-[0_0_40px_rgb(76_130_210/0.55)]">
                <div className="absolute inset-x-2 top-2 bottom-2 grid grid-cols-2 gap-1">
                  <span className="rounded-[2px] bg-white/10" />
                  <span className="rounded-[2px] bg-white/10" />
                </div>
                <span className="absolute -top-[200vh] left-1/2 h-[200vh] w-px -translate-x-1/2 bg-climb-300/50" />
              </div>
            </div>
          </div>

          {/* Paneles por piso */}
          <div className="relative lg:col-span-6 lg:h-[420px]">
            <ol className="space-y-4 lg:space-y-0">
              {stops.map((s, i) => (
                <li key={s.slug} data-stop className="lg:absolute lg:inset-0">
                  <Link href={`/catalogo?categoria=${s.slug}`} data-cursor="Explorar" className="group block h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-colors hover:border-climb-300/40 hover:bg-white/[0.07] lg:p-10">
                    <div className="flex items-start justify-between gap-4">
                      <span className="grid size-14 place-items-center rounded-xl bg-climb-500/15 text-climb-300 ring-1 ring-climb-300/25 lg:size-20">
                        <CategoryIcon slug={s.slug} className="size-7 lg:size-10" />
                      </span>
                      <span className="font-mono text-[12px] tracking-[0.2em] text-white/40">PISO {String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="mt-8 text-[26px] leading-tight font-semibold !text-white lg:text-[44px]">{s.name}</h3>
                    {s.description && <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/60 lg:text-[17px]">{s.description}</p>}
                    <span className="mt-8 inline-flex items-center gap-2 text-[14px] font-medium text-climb-300">
                      {s.productCount ? `${s.productCount} ${s.productCount === 1 ? "repuesto" : "repuestos"}` : "Explorar categoría"}
                      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
