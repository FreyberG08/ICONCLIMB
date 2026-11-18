"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { cn } from "@/lib/cn";

interface Suggestion {
  slug: string;
  name: string;
  sku: string;
  brandName: string | null;
  reference: string | null;
}

/**
 * Buscador con sugerencias instantáneas por nombre, SKU, código, marca o referencia.
 * Funciona sin JavaScript (formulario GET a /catalogo).
 */
export function SearchBox({
  size = "md",
  defaultValue = "",
  autoFocus,
  className,
  placeholder = "Buscar por nombre, SKU, código o referencia…",
}: {
  size?: "md" | "lg";
  defaultValue?: string;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) {
          const data = (await res.json()) as { items: Suggestion[] };
          setItems(data.items);
          setActive(-1);
        }
      } catch {
        /* petición cancelada */
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const showList = open && q.trim().length >= 2;

  return (
    <div ref={wrap} className={cn("relative", className)}>
      <form
        action="/catalogo"
        role="search"
        onSubmit={(e) => {
          if (active >= 0 && items[active]) {
            e.preventDefault();
            setOpen(false);
            router.push(`/producto/${items[active].slug}`);
          }
        }}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">Buscar repuestos</label>
        <div
          className={cn(
            "group flex items-center rounded-lg border border-steel-200 bg-white transition-[border-color,box-shadow] focus-within:border-climb-500 focus-within:shadow-[var(--shadow-focus)] hover:border-steel-300",
            size === "lg" ? "h-14 pl-5 shadow-[var(--shadow-raised)]" : "h-10 pl-3",
          )}
        >
          <Search className={cn("shrink-0 text-steel-400", size === "lg" ? "size-5" : "size-4")} aria-hidden="true" />
          <input
            id={`${listId}-input`}
            name="q"
            value={q}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, -1));
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            className={cn(
              "h-full min-w-0 flex-1 bg-transparent px-3 text-ink placeholder:text-steel-400 focus:outline-none",
              size === "lg" ? "text-base" : "text-sm",
            )}
          />
          {size === "lg" ? (
            <button type="submit" className="mr-2 inline-flex h-10 items-center gap-2 rounded-md bg-climb-600 px-4 text-sm font-medium text-white transition-colors hover:bg-climb-700">
              Buscar <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="mr-2 hidden rounded border border-steel-200 px-1.5 font-mono text-[10px] text-steel-400 lg:block">↵</kbd>
          )}
        </div>
      </form>

      {showList && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-steel-150 bg-white shadow-[var(--shadow-raised)] animate-fade-up">
          <ul id={listId} role="listbox" aria-label="Sugerencias">
            {items.map((it, i) => (
              <li key={it.slug} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <Link
                  href={`/producto/${it.slug}`}
                  onClick={() => setOpen(false)}
                  className={cn("flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors", i === active ? "bg-climb-50" : "hover:bg-steel-50")}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{it.name}</span>
                    <span className="block truncate text-[12px] text-steel-500">
                      {[it.brandName, it.reference && `Ref. ${it.reference}`].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </span>
                  <span className="sku shrink-0">{it.sku}</span>
                </Link>
              </li>
            ))}
          </ul>
          {!loading && items.length === 0 && (
            <p className="px-4 py-3 text-sm text-steel-500">Sin coincidencias directas. Presione Enter para buscar en todo el catálogo.</p>
          )}
          <Link
            href={`/catalogo?q=${encodeURIComponent(q.trim())}`}
            onClick={() => setOpen(false)}
            className="flex items-center justify-between border-t border-steel-100 bg-steel-25 px-4 py-2.5 text-[13px] font-medium text-climb-700 hover:bg-steel-50"
          >
            Ver todos los resultados para “{q.trim()}” <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
