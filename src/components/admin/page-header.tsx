import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1 text-[13px] text-steel-500 hover:text-ink">
          <ChevronLeft className="size-3.5" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] leading-tight font-semibold sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-[14px] text-steel-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
