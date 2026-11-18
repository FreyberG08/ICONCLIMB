import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-steel-700">
        {label}
        {required && <span className="ml-0.5 text-climb-600" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[12.5px] text-err-600" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-[12.5px] text-steel-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("field-input", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn("field-input min-h-24 resize-y leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "field-input appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7684' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-9",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({ label, description, className, ...props }: ComponentProps<"input"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", props.disabled && "cursor-not-allowed opacity-60", className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-steel-300 accent-climb-600" {...props} />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-[12.5px] text-steel-500">{description}</span>}
      </span>
    </label>
  );
}
