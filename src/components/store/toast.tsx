"use client";

import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { useStore } from "./store-state";

export function StoreToast() {
  const { toast } = useStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
      {toast && (
        <div key={toast.id} className="pointer-events-auto flex items-center gap-3 rounded-lg border border-steel-150 bg-white py-3 pr-3 pl-4 text-sm shadow-[var(--shadow-raised)] animate-fade-up">
          <CircleCheck className="size-4 text-ok-600" aria-hidden="true" />
          <span className="text-ink">{toast.message}</span>
          {toast.href && (
            <Link href={toast.href} className="rounded-md bg-steel-100 px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-steel-150">
              {toast.hrefLabel ?? "Ver"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
