import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function Pagination({ page, total, pageSize, hrefFor }: { page: number; total: number; pageSize: number; hrefFor: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const nums: (number | "…")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  const cls = "grid h-9 min-w-9 place-items-center rounded-md px-2 text-sm font-medium transition-colors";
  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Paginación">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(cls, "text-steel-600 hover:bg-steel-100")} aria-label="Página anterior"><ChevronLeft className="size-4" /></Link>
      ) : (
        <span className={cn(cls, "text-steel-300")} aria-hidden="true"><ChevronLeft className="size-4" /></span>
      )}
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`e${i}`} className="px-1 text-steel-400">…</span>
        ) : (
          <Link key={n} href={hrefFor(n)} aria-current={n === page ? "page" : undefined} className={cn(cls, n === page ? "bg-ink text-white" : "text-steel-600 hover:bg-steel-100")}>
            {n}
          </Link>
        ),
      )}
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={cn(cls, "text-steel-600 hover:bg-steel-100")} aria-label="Página siguiente"><ChevronRight className="size-4" /></Link>
      ) : (
        <span className={cn(cls, "text-steel-300")} aria-hidden="true"><ChevronRight className="size-4" /></span>
      )}
    </nav>
  );
}
