"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ClipboardList, Menu, ShoppingCart, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SearchBox } from "./search-box";
import { useStore } from "./store-state";
import { CategoryIcon } from "./category-icon";
import { cn } from "@/lib/cn";

interface NavCategory {
  name: string;
  slug: string;
  productCount?: number;
}

function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-climb-600 px-1 font-mono text-[10px] leading-none font-semibold text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function Header({ categories }: { categories: NavCategory[] }) {
  const { cart, quote, ready } = useStore();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const cartCount = ready ? cart.reduce((s, l) => s + l.quantity, 0) : 0;
  const quoteCount = ready ? quote.length : 0;

  useEffect(() => {
    setMenuOpen(false);
    setCatOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = [
    { href: "/catalogo", label: "Catálogo" },
    { href: "/#como-comprar", label: "Cómo comprar" },
    { href: "/seguimiento", label: "Seguimiento" },
    { href: "/#respaldo", label: "Respaldo CLIMB" },
  ];

  return (
    <header className={cn("sticky top-0 z-40 border-b bg-white/90 backdrop-blur-md transition-[border-color,box-shadow]", scrolled ? "border-steel-150 shadow-[0_1px_0_rgb(10_20_34/0.03)]" : "border-transparent")}>
      <div className="container-x flex h-16 items-center gap-4 lg:gap-8">
        <button
          type="button"
          className="-ml-2 grid size-10 place-items-center rounded-md text-steel-700 hover:bg-steel-100 lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <Link href="/" className="shrink-0" aria-label="Inicio">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          <div className="relative" onMouseLeave={() => setCatOpen(false)}>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-[14px] font-medium text-steel-700 hover:bg-steel-100 hover:text-ink"
              aria-expanded={catOpen}
              aria-haspopup="true"
              onClick={() => setCatOpen((v) => !v)}
              onMouseEnter={() => setCatOpen(true)}
            >
              Categorías <ChevronDown className={cn("size-3.5 transition-transform", catOpen && "rotate-180")} aria-hidden="true" />
            </button>
            {catOpen && (
              <div className="absolute top-full left-0 w-[560px] pt-2">
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-steel-150 bg-white p-2 shadow-[var(--shadow-raised)] animate-fade-up">
                  {categories.map((c) => (
                    <Link key={c.slug} href={`/catalogo?categoria=${c.slug}`} className="group flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-steel-50">
                      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-steel-50 text-climb-600 ring-1 ring-steel-150 group-hover:bg-white">
                        <CategoryIcon slug={c.slug} className="size-4" />
                      </span>
                      <span className="text-[13.5px] leading-snug font-medium text-steel-700 group-hover:text-ink">{c.name}</span>
                    </Link>
                  ))}
                  <Link href="/catalogo" className="col-span-2 mt-1 rounded-md border-t border-steel-100 px-3 pt-3 pb-2 text-[13px] font-medium text-climb-700 hover:underline">
                    Ver todo el catálogo →
                  </Link>
                </div>
              </div>
            )}
          </div>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "inline-flex h-9 items-center rounded-md px-3 text-[14px] font-medium transition-colors",
                pathname === n.href ? "text-ink" : "text-steel-700 hover:bg-steel-100 hover:text-ink",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden max-w-sm flex-1 md:block">
          <SearchBox />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link href="/cotizacion" className="relative grid size-10 place-items-center rounded-md text-steel-700 hover:bg-steel-100 hover:text-ink" aria-label={`Lista de cotización (${quoteCount})`}>
            <ClipboardList className="size-5" aria-hidden="true" />
            <CountBadge n={quoteCount} />
          </Link>
          <Link href="/carrito" className="relative grid size-10 place-items-center rounded-md text-steel-700 hover:bg-steel-100 hover:text-ink" aria-label={`Carrito (${cartCount} unidades)`}>
            <ShoppingCart className="size-5" aria-hidden="true" />
            <CountBadge n={cartCount} />
          </Link>
        </div>
      </div>

      <div className="container-x pb-3 md:hidden">
        <SearchBox />
      </div>

      {menuOpen && (
        <nav id="mobile-nav" className="border-t border-steel-150 bg-white lg:hidden" aria-label="Menú móvil">
          <div className="container-x space-y-1 py-4">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-md px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-steel-50">
                {n.label}
              </Link>
            ))}
            <p className="eyebrow px-3 pt-4 pb-1">Categorías</p>
            <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
              {categories.map((c) => (
                <Link key={c.slug} href={`/catalogo?categoria=${c.slug}`} className="flex items-center gap-3 rounded-md px-3 py-2 text-[14px] text-steel-700 hover:bg-steel-50">
                  <CategoryIcon slug={c.slug} className="size-4 text-climb-600" />
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
