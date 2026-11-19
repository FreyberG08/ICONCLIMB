"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger } from "./effects";

/** Cinta infinita que acelera y se inclina con la velocidad del scroll. */
export function Marquee({ items, dark = false }: { items: string[]; dark?: boolean }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || prefersReducedMotion()) return;
    const loop = gsap.to(el, { xPercent: -50, duration: 38, ease: "none", repeat: -1 });
    const skew = gsap.quickTo(el, "skewX", { duration: 0.5, ease: "power3.out" });
    const st = ScrollTrigger.create({
      onUpdate: (self) => {
        const v = self.getVelocity();
        const boost = gsap.utils.clamp(-6, 6, v / 300);
        loop.timeScale(1 + Math.abs(boost) * 1.2);
        gsap.to(loop, { timeScale: 1, duration: 1.2, overwrite: true, delay: 0.1 });
        skew(gsap.utils.clamp(-8, 8, -v / 220));
      },
    });
    return () => {
      loop.kill();
      st.kill();
    };
  }, []);

  const row = [...items, ...items];
  return (
    <div className={`relative overflow-hidden border-y py-6 ${dark ? "border-white/10 bg-climb-950 text-white" : "border-steel-150 bg-white text-ink"}`} aria-hidden="true">
      <div ref={track} className="flex w-max items-center gap-10 whitespace-nowrap will-change-transform">
        {[...row, ...row].map((t, i) => (
          <span key={i} className="flex items-center gap-10 text-[clamp(28px,4.5vw,64px)] font-semibold tracking-[-0.03em]">
            <span className={i % 2 ? "text-transparent [-webkit-text-stroke:1px_currentColor] opacity-60" : ""}>{t}</span>
            <svg viewBox="0 0 24 24" className="size-[0.5em] text-climb-500" fill="currentColor"><path d="M12 2 22 12 12 22 2 12z" /></svg>
          </span>
        ))}
      </div>
    </div>
  );
}
