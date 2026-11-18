import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border border-steel-150 bg-white shadow-[var(--shadow-card)]", className)}>{children}</div>;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-steel-100 px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-steel-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Alert({ tone = "info", title, children, className }: { tone?: "info" | "success" | "warning" | "error"; title?: ReactNode; children?: ReactNode; className?: string }) {
  const styles = {
    info: "border-climb-100 bg-climb-50 text-climb-800",
    success: "border-ok-600/20 bg-ok-50 text-ok-600",
    warning: "border-warn-600/20 bg-warn-50 text-warn-600",
    error: "border-err-600/20 bg-err-50 text-err-600",
  }[tone];
  const Icon = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle }[tone];
  return (
    <div className={cn("flex gap-3 rounded-md border px-4 py-3 text-sm", styles, className)} role={tone === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-[13.5px] opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-steel-200 bg-steel-25 px-6 py-14 text-center", className)}>
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-full bg-white text-steel-400 ring-1 ring-steel-150">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-steel-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, action, className }: { eyebrow?: string; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="text-[26px] leading-tight font-semibold sm:text-[32px]">{title}</h2>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-steel-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}
