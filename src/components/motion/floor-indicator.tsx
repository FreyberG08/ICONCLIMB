"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, ScrollTrigger } from "./effects";

interface Floor {
  id: string;
  label: string;
}

/**
 * Display de piso de ascensor, fijo a la derecha. Cada sección con data-floor
 * es una "planta"; al hacer scroll el display cambia con flecha de dirección.
 */
export function FloorIndicator() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [tick, setTick] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-floor]"));
    setFloors(els.map((el) => ({ id: el.dataset.floor ?? "", label: el.dataset.floorLabel ?? "" })));
    const triggers = els.map((el, i) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) => {
          if (!self.isActive) return;
          setDir(i >= prev.current ? 1 : -1);
          prev.current = i;
          setCurrent(i);
          setTick((t) => t + 1);
        },
      }),
    );
    return () => triggers.forEach((t) => t.kill());
  }, []);

  if (!floors.length || (typeof window !== "undefined" && prefersReducedMotion())) return null;
  const f = floors[current];

  return (
    <aside className="fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 min-[1560px]:block" aria-hidden="true">
      <div className="flex flex-col items-center gap-3 rounded-full border border-steel-200/80 bg-white/80 px-2 py-3 shadow-[var(--shadow-raised)] backdrop-blur-md">
        <div className="relative grid h-14 w-11 place-items-center overflow-hidden rounded-full bg-climb-950">
          <svg viewBox="0 0 12 12" className={`absolute top-1.5 size-2.5 text-climb-300 transition-transform duration-500 ${dir < 0 ? "rotate-180" : ""}`}><path d="M6 1 11 9H1z" fill="currentColor" /></svg>
          <span key={tick} className="floor-roll mt-2 font-mono text-[15px] font-semibold text-white tabular-nums [text-shadow:0_0_10px_rgb(130_169_227/0.9)]" data-dir={dir}>
            {f?.id}
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {floors.map((fl, i) => (
            <li key={fl.id} className="group relative flex justify-center">
              <span className={`block size-1.5 rounded-full transition-all duration-500 ${i === current ? "scale-150 bg-climb-500" : "bg-steel-300"}`} />
              <span className="pointer-events-none absolute top-1/2 right-6 -translate-y-1/2 rounded bg-ink px-2 py-1 font-mono text-[10px] tracking-wider whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                {fl.id} · {fl.label}
              </span>
            </li>
          ))}
        </ul>
        <span className="max-w-11 text-center font-mono text-[8px] leading-tight tracking-wider text-steel-500 uppercase">{f?.label}</span>
      </div>
    </aside>
  );
}
