"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { finePointer, gsap, prefersReducedMotion, ScrollTrigger, SplitText } from "./effects";

/**
 * Portada animada: titular letra por letra, ilustración con profundidad que sigue
 * al mouse, piezas flotantes, foco de luz sobre la retícula y salida con el scroll.
 */
export function HeroStage({ copy, visual, strip }: { copy: ReactNode; visual: ReactNode; strip?: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) {
      el?.querySelectorAll<HTMLElement>("[data-hero-hide]").forEach((n) => (n.style.visibility = "visible"));
      return;
    }
    const introPlaying = document.documentElement.classList.contains("intro");
    const delay = introPlaying ? 2.35 : 0.35;
    const splits: SplitText[] = [];
    const cleanups: (() => void)[] = [];

    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>("[data-hero-hide]").forEach((n) => (n.style.visibility = "visible"));
      const tl = gsap.timeline({ delay });
      const title = el.querySelector<HTMLElement>("[data-hero-title]");
      if (title) {
        const s = SplitText.create(title, { type: "lines,words,chars", mask: "lines" });
        splits.push(s);
        tl.from(s.chars, { yPercent: 120, rotate: 8, duration: 1.25, ease: "expo.out", stagger: 0.022 });
      }
      tl.from("[data-hero-eyebrow]", { autoAlpha: 0, x: -30, duration: 1, ease: "expo.out" }, 0.1)
        .from("[data-hero-text]", { autoAlpha: 0, y: 30, filter: "blur(8px)", duration: 1.2, ease: "expo.out" }, 0.55)
        .from("[data-hero-search]", { autoAlpha: 0, y: 40, scale: 0.96, duration: 1.2, ease: "expo.out" }, 0.7)
        .from("[data-hero-cta] > *", { autoAlpha: 0, y: 24, duration: 1, ease: "expo.out", stagger: 0.1 }, 0.85)
        .from("[data-hero-visual]", { autoAlpha: 0, scale: 0.86, rotateY: -18, rotateX: 8, duration: 1.8, ease: "expo.out" }, 0.2)
        .from("[data-hero-chip]", { autoAlpha: 0, scale: 0.4, duration: 1, ease: "back.out(2)", stagger: 0.12 }, 1)
        .from("[data-hero-strip] > *", { autoAlpha: 0, y: 30, duration: 1, ease: "expo.out", stagger: 0.08 }, 1);

      // Piezas flotantes en órbita suave
      gsap.utils.toArray<HTMLElement>("[data-hero-chip]").forEach((chip, i) => {
        gsap.to(chip, { y: i % 2 ? 14 : -14, x: i % 2 ? -6 : 8, duration: 3 + i * 0.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
      });

      // Salida con el scroll: el texto sube y se desvanece, la ilustración se acerca
      gsap.to("[data-hero-copy]", { yPercent: -18, autoAlpha: 0.2, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true } });
      gsap.to("[data-hero-visual-wrap]", { yPercent: 12, scale: 1.08, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true } });
    }, el);

    // Profundidad con el mouse
    if (finePointer()) {
      const visual = el.querySelector<HTMLElement>("[data-hero-visual]");
      const chips = el.querySelectorAll<HTMLElement>("[data-hero-chip]");
      const rx = visual ? gsap.quickTo(visual, "rotationX", { duration: 0.9, ease: "power3.out" }) : null;
      const ry = visual ? gsap.quickTo(visual, "rotationY", { duration: 0.9, ease: "power3.out" }) : null;
      const chipMovers = Array.from(chips).map((c, i) => ({
        x: gsap.quickTo(c, "xPercent", { duration: 1.2, ease: "power3.out" }),
        y: gsap.quickTo(c, "yPercent", { duration: 1.2, ease: "power3.out" }),
        depth: 30 + i * 18,
      }));
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--sx", `${e.clientX - r.left}px`);
        el.style.setProperty("--sy", `${e.clientY - r.top}px`);
        ry?.(px * 16);
        rx?.(-py * 12);
        chipMovers.forEach((m) => {
          m.x(px * m.depth);
          m.y(py * m.depth);
        });
      };
      el.addEventListener("pointermove", move);
      cleanups.push(() => el.removeEventListener("pointermove", move));
    }
    ScrollTrigger.refresh();

    return () => {
      cleanups.forEach((f) => f());
      splits.forEach((s) => s.revert());
      ctx.revert();
    };
  }, []);

  return (
    <section ref={root} data-floor="PB" data-floor-label="Inicio" className="hero-stage relative overflow-hidden border-b border-steel-150 bg-gradient-to-b from-white via-steel-25 to-steel-50">
      <div className="blueprint absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_72%)]" aria-hidden="true" />
      <div className="hero-spotlight pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="hero-aurora pointer-events-none absolute -top-40 right-[-10%] h-[620px] w-[620px] rounded-full" aria-hidden="true" />
      <div className="container-x relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-12 lg:gap-8 lg:py-28">
        <div data-hero-copy className="min-w-0 lg:col-span-7">{copy}</div>
        <div data-hero-visual-wrap className="lg:col-span-5 [perspective:1400px]">{visual}</div>
      </div>
      {strip}
    </section>
  );
}
