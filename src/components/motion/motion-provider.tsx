"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, initEffects, prefersReducedMotion, ScrollTrigger } from "./effects";

let lenis: Lenis | null = null;

export function getLenis() {
  return lenis;
}

/** Desplazamiento suave + efectos de scroll. Se desactiva con "reducir movimiento". */
export function MotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (prefersReducedMotion()) {
      document.documentElement.classList.remove("motion");
      return;
    }
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, anchors: { offset: -80 }, autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  useEffect(() => {
    const root = document.getElementById("contenido");
    if (!root || prefersReducedMotion()) {
      document.documentElement.classList.remove("motion");
      return;
    }
    lenis?.scrollTo(0, { immediate: true });
    let cleanup: (() => void) | undefined;
    // Espera a que React pinte la nueva ruta antes de medir.
    const id = requestAnimationFrame(() => {
      cleanup = initEffects(root);
      document.documentElement.dataset.motionInit = "1";
      ScrollTrigger.refresh();
    });
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("load", onLoad);
      cleanup?.();
    };
  }, [pathname]);

  return <>{children}</>;
}
