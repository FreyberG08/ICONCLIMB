"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityInput({ value, onChange, max = 9999, label = "Cantidad", size = "md" }: { value: number; onChange: (n: number) => void; max?: number; label?: string; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-9" : "h-12";
  return (
    <div className={`inline-flex ${h} items-stretch overflow-hidden rounded-md border border-steel-200 bg-white`}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} className="grid w-9 place-items-center text-steel-600 hover:bg-steel-50 disabled:text-steel-300" aria-label="Disminuir cantidad">
        <Minus className="size-3.5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) ? Math.max(1, Math.min(max, n)) : 1);
        }}
        className="w-12 border-x border-steel-200 text-center font-mono text-sm text-ink tabular-nums focus:bg-climb-50 focus:outline-none"
      />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="grid w-9 place-items-center text-steel-600 hover:bg-steel-50 disabled:text-steel-300" aria-label="Aumentar cantidad">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
