"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };

export const EASE = "expo.out";

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function finePointer() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * Efectos declarativos por atributos data-* (los componentes de servidor solo marcan el HTML):
 *   data-split="chars|words|lines"  texto que se revela con máscara al entrar en pantalla
 *   data-reveal                       aparece deslizándose (data-delay opcional, en s)
 *   data-stagger                      sus hijos aparecen escalonados
 *   data-parallax="0.15"              desplazamiento ligado al scroll
 *   data-scrub-line                   línea que se dibuja con el scroll
 *   data-magnetic                     botón magnético que sigue al cursor
 *   data-tilt                         tarjeta con inclinación 3D y brillo
 *   data-spotlight                    foco de luz que sigue al cursor
 */
export function initEffects(root: HTMLElement): () => void {
  const cleanups: (() => void)[] = [];

  const ctx = gsap.context(() => {
    // Textos divididos con máscara
    root.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
      const type = (el.dataset.split as "chars" | "words" | "lines") || "words";
      const delay = Number(el.dataset.delay ?? 0);
      const split = SplitText.create(el, {
        type: type === "chars" ? "lines,words,chars" : type === "words" ? "lines,words" : "lines",
        mask: "lines",
        linesClass: "split-line",
        autoSplit: true,
        onSplit(self) {
          const targets = type === "chars" ? self.chars : type === "words" ? self.words : self.lines;
          return gsap.from(targets, {
            yPercent: 115,
            rotate: type === "lines" ? 0 : 4,
            opacity: 0,
            duration: type === "chars" ? 1.1 : 1.2,
            ease: EASE,
            stagger: type === "chars" ? 0.018 : type === "words" ? 0.05 : 0.09,
            delay,
            scrollTrigger: el.dataset.immediate ? undefined : { trigger: el, start: "top 88%", once: true },
          });
        },
      });
      cleanups.push(() => split.revert());
      el.style.visibility = "visible";
    });

    // Aparición deslizante
    root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 48, filter: "blur(6px)" },
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 1.3,
          ease: EASE,
          delay: Number(el.dataset.delay ?? 0),
          scrollTrigger: el.dataset.immediate ? undefined : { trigger: el, start: "top 90%", once: true },
          clearProps: "filter",
        },
      );
    });

    // Grupos escalonados
    root.querySelectorAll<HTMLElement>("[data-stagger]").forEach((group) => {
      const items = Array.from(group.children) as HTMLElement[];
      gsap.set(items, { autoAlpha: 0, y: 60, scale: 0.96 });
      ScrollTrigger.batch(items, {
        start: "top 92%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { autoAlpha: 1, y: 0, scale: 1, duration: 1.1, ease: EASE, stagger: 0.08, overwrite: true }),
      });
    });

    // Parallax
    root.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
      const speed = Number(el.dataset.parallax || 0.15);
      gsap.fromTo(
        el,
        { yPercent: -speed * 100 },
        { yPercent: speed * 100, ease: "none", scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: true } },
      );
    });

    // Líneas que se dibujan
    root.querySelectorAll<HTMLElement>("[data-scrub-line]").forEach((el) => {
      gsap.fromTo(el, { scaleY: 0 }, { scaleY: 1, ease: "none", transformOrigin: "top", scrollTrigger: { trigger: el.parentElement ?? el, start: "top 75%", end: "bottom 60%", scrub: 0.6 } });
    });
  }, root);

  // Interacciones de puntero (solo escritorio)
  if (finePointer()) {
    root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
      const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.38);
      };
      const leave = () => {
        xTo(0);
        yTo(0);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      });
    });

    root.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => {
      const rx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3.out" });
      const ry = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3.out" });
      gsap.set(el, { transformPerspective: 900 });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * 10);
        rx((0.5 - py) * 10);
        el.style.setProperty("--gx", `${px * 100}%`);
        el.style.setProperty("--gy", `${py * 100}%`);
      };
      const leave = () => {
        rx(0);
        ry(0);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      });
    });

    root.querySelectorAll<HTMLElement>("[data-spotlight]").forEach((el) => {
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--sx", `${e.clientX - r.left}px`);
        el.style.setProperty("--sy", `${e.clientY - r.top}px`);
      };
      el.addEventListener("pointermove", move);
      cleanups.push(() => el.removeEventListener("pointermove", move));
    });
  }

  return () => {
    cleanups.forEach((fn) => fn());
    ctx.revert();
  };
}
