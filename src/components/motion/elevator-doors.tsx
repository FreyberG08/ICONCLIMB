"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "./effects";

let firstMount = true;

/**
 * Puertas de ascensor:
 *  - Primera visita de la sesión: intro con display de piso contando y apertura de puertas.
 *  - Cada cambio de página: las puertas se abren sobre la nueva "planta".
 */
export function ElevatorDoors() {
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const html = document.documentElement;
    const isFirst = firstMount;
    firstMount = false;
    if (prefersReducedMotion()) {
      html.classList.remove("intro");
      el.style.display = "none";
      return;
    }
    const intro = isFirst && html.classList.contains("intro");
    if (isFirst && !intro) {
      el.style.display = "none";
      return;
    }

    const left = el.querySelector("[data-door=left]");
    const right = el.querySelector("[data-door=right]");
    const panel = el.querySelector("[data-door=display]");
    el.style.display = "block";
    const tl = gsap.timeline({
      onComplete: () => {
        el.style.display = "none";
        html.classList.remove("intro");
        try {
          sessionStorage.setItem("icon.intro", "1");
        } catch {
          /* almacenamiento no disponible */
        }
      },
    });

    if (intro) {
      const state = { n: 0 };
      tl.set([left, right], { xPercent: 0 })
        .fromTo(panel, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "expo.out" })
        .to(state, {
          n: 9,
          duration: 1.1,
          ease: "power2.inOut",
          onUpdate: () => {
            if (counter.current) counter.current.textContent = String(Math.round(state.n)).padStart(2, "0");
          },
        }, "<0.1")
        .add(() => {
          if (counter.current) counter.current.textContent = "AICON";
        })
        .to(panel, { autoAlpha: 0, y: -12, duration: 0.45, ease: "power2.in" }, "+=0.35")
        .to(left, { xPercent: -101, duration: 1.15, ease: "expo.inOut" }, "<0.15")
        .to(right, { xPercent: 101, duration: 1.15, ease: "expo.inOut" }, "<");
    } else {
      tl.set(panel, { autoAlpha: 0 })
        .set([left, right], { xPercent: 0 })
        .to(left, { xPercent: -101, duration: 0.85, ease: "expo.inOut" }, 0.05)
        .to(right, { xPercent: 101, duration: 0.85, ease: "expo.inOut" }, "<");
    }
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div ref={root} className="elevator-doors pointer-events-none fixed inset-0 z-[100]" aria-hidden="true">
      <div data-door="left" className="door absolute inset-y-0 left-0 w-1/2 border-r border-white/10 bg-climb-950">
        <div className="door-grid absolute inset-0" />
        <div className="absolute inset-y-0 right-6 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />
      </div>
      <div data-door="right" className="door absolute inset-y-0 right-0 w-1/2 border-l border-white/10 bg-climb-950">
        <div className="door-grid absolute inset-0" />
        <div className="absolute inset-y-0 left-6 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />
      </div>
      <div data-door="display" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="rounded-lg border border-white/15 bg-black/40 px-8 py-5 shadow-[0_0_80px_rgb(31_95_191/0.35)]">
          <div className="flex items-center justify-center gap-4">
            <svg viewBox="0 0 12 12" className="size-4 animate-pulse text-climb-300" aria-hidden="true"><path d="M6 1 11 9H1z" fill="currentColor" /></svg>
            <span ref={counter} className="font-mono text-5xl font-semibold tracking-[0.12em] text-white tabular-nums [text-shadow:0_0_24px_rgb(130_169_227/0.8)]">00</span>
          </div>
          <p className="mt-3 font-mono text-[10px] tracking-[0.3em] text-white/45">REPUESTOS PARA ASCENSORES</p>
        </div>
      </div>
    </div>
  );
}
