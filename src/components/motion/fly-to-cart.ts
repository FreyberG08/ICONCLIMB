"use client";

import { gsap, prefersReducedMotion } from "./effects";

/** Anima una copia de la imagen del producto volando hasta el ícono del carrito o de la cotización. */
export function flyToTarget(source: Element | null, target: "cart" | "quote") {
  const dest = document.querySelector<HTMLElement>(`[data-fly-target="${target}"]`);
  if (!dest) return;
  const bump = () => gsap.fromTo(dest, { scale: 1 }, { scale: 1.35, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" });
  if (!source || prefersReducedMotion()) return bump();
  const r = source.getBoundingClientRect();
  const size = Math.min(150, r.width * 0.45);
  const s = { left: r.left + r.width / 2 - size / 2, top: r.top + r.height / 2 - size / 2, width: size, height: size };
  const d = dest.getBoundingClientRect();
  const ghost = document.createElement("div");
  const img = source.querySelector("img");
  ghost.style.cssText = `position:fixed;left:${s.left}px;top:${s.top}px;width:${size}px;height:${size}px;z-index:120;pointer-events:none;border-radius:18px;overflow:hidden;background:#fff;border:1px solid #dde2e8;box-shadow:0 30px 60px -20px rgb(10 33 73/.45)`;
  if (img) {
    const c = img.cloneNode() as HTMLImageElement;
    c.removeAttribute("srcset");
    c.style.cssText = "position:absolute;inset:8%;width:84%;height:84%;object-fit:contain;mix-blend-mode:multiply";
    ghost.appendChild(c);
  } else {
    ghost.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;background:#eef4fc"><svg viewBox="0 0 24 24" width="44%" height="44%" fill="none" stroke="#1f5fbf" stroke-width="1.6"><path d="M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/></svg></div>`;
  }
  document.body.appendChild(ghost);
  const dx = d.left + d.width / 2 - (s.left + s.width / 2);
  const dy = d.top + d.height / 2 - (s.top + s.height / 2);
  gsap
    .timeline({ onComplete: () => { ghost.remove(); bump(); } })
    .from(ghost, { scale: 0.4, autoAlpha: 0, duration: 0.3, ease: "back.out(2)" })
    .to(ghost, { y: -40, duration: 0.25, ease: "power2.out" })
    .to(ghost, { x: dx, duration: 0.8, ease: "power2.inOut" })
    .to(ghost, { y: dy, duration: 0.8, ease: "power2.in" }, "<")
    .to(ghost, { scale: 0.12, borderRadius: "999px", rotate: 25, duration: 0.8, ease: "power3.in" }, "<")
    .to(ghost, { autoAlpha: 0, duration: 0.15 }, "-=0.12");
}
