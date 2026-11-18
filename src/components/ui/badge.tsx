import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/labels";

const tones: Record<Tone, string> = {
  neutral: "bg-steel-100 text-steel-700 ring-steel-200",
  blue: "bg-climb-50 text-climb-700 ring-climb-100",
  green: "bg-ok-50 text-ok-600 ring-ok-600/15",
  amber: "bg-warn-50 text-warn-600 ring-warn-600/20",
  red: "bg-err-50 text-err-600 ring-err-600/15",
  muted: "bg-steel-50 text-steel-500 ring-steel-150",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset whitespace-nowrap", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
