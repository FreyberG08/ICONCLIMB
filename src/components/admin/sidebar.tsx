"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeftRight, ClipboardList, ExternalLink, FileSpreadsheet, FolderTree, History, LayoutDashboard, LogOut, Menu, Package,
  ShoppingBag, Tags, Users, Warehouse, X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { can, ROLE_LABELS } from "@/lib/permissions";
import type { Permission, StaffUser } from "@/lib/types";
import { logout } from "@/app/admin/auth-actions";

const NAV: { section: string; items: { href: string; label: string; icon: typeof Package; perm: Permission | Permission[]; exact?: boolean }[] }[] = [
  {
    section: "General",
    items: [{ href: "/admin", label: "Panel", icon: LayoutDashboard, perm: "catalog.view", exact: true }],
  },
  {
    section: "Catálogo",
    items: [
      { href: "/admin/productos", label: "Productos", icon: Package, perm: "catalog.view" },
      { href: "/admin/categorias", label: "Categorías", icon: FolderTree, perm: "taxonomy.manage" },
      { href: "/admin/marcas", label: "Marcas", icon: Tags, perm: "taxonomy.manage" },
    ],
  },
  {
    section: "Operación",
    items: [
      { href: "/admin/inventario", label: "Inventario", icon: Warehouse, perm: "catalog.view", exact: true },
      { href: "/admin/inventario/movimientos", label: "Movimientos", icon: ArrowLeftRight, perm: "catalog.view" },
      { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag, perm: "orders.view" },
      { href: "/admin/cotizaciones", label: "Cotizaciones", icon: ClipboardList, perm: "quotes.manage" },
    ],
  },
  {
    section: "Administración",
    items: [
      { href: "/admin/datos", label: "Importar / exportar", icon: FileSpreadsheet, perm: ["data.import", "data.export"] },
      { href: "/admin/usuarios", label: "Usuarios y permisos", icon: Users, perm: "users.manage" },
      { href: "/admin/auditoria", label: "Auditoría", icon: History, perm: "audit.view" },
    ],
  },
];

export function Sidebar({ user, counts }: { user: StaffUser; counts: { quotes: number; orders: number; review: number } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const badge = (href: string) => {
    const n = href === "/admin/cotizaciones" ? counts.quotes : href === "/admin/pedidos" ? counts.orders : href === "/admin/productos" ? counts.review : 0;
    return n > 0 ? <span className="ml-auto rounded-full bg-climb-600 px-1.5 font-mono text-[10px] leading-4 font-semibold text-white">{n}</span> : null;
  };

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-steel-150 px-5">
        <Link href="/admin"><Logo compact /></Link>
        <span className="rounded bg-steel-100 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-steel-500">PANEL</span>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 [scrollbar-width:thin] [scrollbar-color:var(--color-steel-200)_transparent]" aria-label="Panel">
        {NAV.map((group) => {
          const items = group.items.filter((i) => (Array.isArray(i.perm) ? i.perm.some((p) => can(user.role, p)) : can(user.role, i.perm)));
          if (!items.length) return null;
          return (
            <div key={group.section}>
              <p className="eyebrow mb-2 px-3 !text-[10px] !text-steel-400">{group.section}</p>
              <ul className="space-y-0.5">
                {items.map((i) => {
                  const active = i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`);
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors",
                          active ? "bg-climb-50 text-climb-800" : "text-steel-600 hover:bg-steel-50 hover:text-ink",
                        )}
                      >
                        <i.icon className={cn("size-4", active ? "text-climb-600" : "text-steel-400")} strokeWidth={1.75} aria-hidden="true" />
                        {i.label}
                        {badge(i.href)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-steel-150 p-3">
        <Link href="/" target="_blank" className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-steel-600 hover:bg-steel-50 hover:text-ink">
          <ExternalLink className="size-4 text-steel-400" /> Ver tienda
        </Link>
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-semibold text-white">
            {(user.fullName || user.email).slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{user.fullName || user.email}</span>
            <span className="block truncate text-[11.5px] text-steel-500">{ROLE_LABELS[user.role]}</span>
          </span>
          <form action={logout}>
            <button type="submit" className="grid size-8 place-items-center rounded-md text-steel-400 hover:bg-steel-100 hover:text-ink" aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-steel-150 bg-white px-4 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="-ml-1 grid size-9 place-items-center rounded-md hover:bg-steel-100" aria-label="Abrir menú">
          <Menu className="size-5" />
        </button>
        <Logo compact />
      </div>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-steel-150 bg-white lg:block">{content}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl animate-fade-up">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-4 right-3 z-10 grid size-8 place-items-center rounded-md hover:bg-steel-100" aria-label="Cerrar menú">
              <X className="size-4" />
            </button>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
