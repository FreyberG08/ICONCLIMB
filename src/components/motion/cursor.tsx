"use client";

import { useEffect, useRef } from "react";
import { finePointer, gsap, prefersReducedMotion } from "./effects";

/** Anillo que sigue al cursor (escritorio). Se agranda sobre enlaces y muestra etiquetas data-cursor. */
export function CursorFollower() {
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ring.current;
    if (!el || !finePointer() || prefersReducedMotion()) return;
    el.style.display = "grid";
    const xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });
    let visible = false;
    const move = (e: PointerEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
      if (!visible) {
        visible = true;
        gsap.to(el, { autoAlpha: 1, duration: 0.3 });
      }
      const t = e.target as HTMLElement | null;
      const labeled = t?.closest<HTMLElement>("[data-cursor]");
      const interactive = t?.closest("a, button, [role=button], input, select, textarea, label");
      if (labeled) {
        if (label.current) label.current.textContent = labeled.dataset.cursor ?? "";
        gsap.to(el, { width: 84, height: 84, backgroundColor: "rgba(18,62,130,0.92)", borderColor: "rgba(18,62,130,0)", duration: 0.35, ease: "power3.out" });
        gsap.to(label.current, { autoAlpha: 1, scale: 1, duration: 0.25 });
      } else {
        gsap.to(label.current, { autoAlpha: 0, scale: 0.6, duration: 0.2 });
        gsap.to(el, interactive
          ? { width: 46, height: 46, backgroundColor: "rgba(31,95,191,0.08)", borderColor: "rgba(31,95,191,0.6)", duration: 0.3 }
          : { width: 26, height: 26, backgroundColor: "rgba(31,95,191,0)", borderColor: "rgba(10,33,73,0.35)", duration: 0.3 });
      }
    };
    const leave = () => {
      visible = false;
      gsap.to(el, { autoAlpha: 0, duration: 0.3 });
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div
      ref={ring}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[90] hidden size-[26px] place-items-center rounded-full border border-climb-900/35 opacity-0 mix-blend-normal"
      style={{ translate: "-50% -50%" }}
    >
      <span ref={label} className="font-mono text-[10px] font-semibold tracking-[0.18em] text-white uppercase opacity-0" />
    </div>
  );
}
