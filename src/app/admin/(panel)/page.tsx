import Link from "next/link";
import { AlertTriangle, ArrowRight, Camera, ClipboardList, Eye, FileEdit, PackageCheck, PackagePlus, PackageX, ShoppingBag, TrendingUp } from "lucide-react";
import { getAdminRepo } from "@/lib/data";
import { can } from "@/lib/permissions";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUS, PRODUCT_STATUS, QUOTE_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Alert, Card, CardHeader } from "@/components/ui/misc";

export const metadata = { title: "Panel" };

function Stat({ label, value, href, icon: Icon, tone = "default", hint }: { label: string; value: number | string; href?: string; icon: typeof Eye; tone?: "default" | "warn" | "err" | "ok"; hint?: string }) {
  const toneCls = { default: "text-climb-600 bg-climb-50", warn: "text-warn-600 bg-warn-50", err: "text-err-600 bg-err-50", ok: "text-ok-600 bg-ok-50" }[tone];
  const body = (
    <div className="group flex h-full flex-col rounded-lg border border-steel-150 bg-white p-4 transition-[border-color,box-shadow] hover:border-steel-200 hover:shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <span className={`grid size-8 place-items-center rounded-md ${toneCls}`}><Icon className="size-4" strokeWidth={1.75} /></span>
        {href && <ArrowRight className="size-3.5 text-steel-300 transition-transform group-hover:translate-x-0.5 group-hover:text-steel-500" />}
      </div>
      <p className="mt-4 text-[28px] leading-none font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      <p className="mt-1.5 text-[13px] text-steel-500">{label}</p>
      {hint && <p className="mt-0.5 text-[11.5px] text-steel-400">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const repo = await getAdminRepo("catalog.view");
  const s = await repo.dashboard();
  const u = repo.user;
  const canOrders = can(u.role, "orders.view");
  const canQuotes = can(u.role, "quotes.manage");

  return (
    <>
      <PageHeader
        title={`Hola, ${u.fullName.split(" ")[0] || "equipo"}`}
        description="Estado del catálogo, inventario y solicitudes. Todas las cifras provienen de los registros actuales."
        actions={
          <>
            {can(u.role, "inventory.manage") && <LinkButton href="/admin/inventario/ingreso" variant="outline"><PackagePlus className="size-4" /> Registrar ingreso</LinkButton>}
            {can(u.role, "catalog.edit") && <LinkButton href="/admin/productos/nuevo"><PackagePlus className="size-4" /> Nuevo producto</LinkButton>}
          </>
        }
      />

      {denied && <Alert tone="warning" className="mb-6">Su rol no tiene acceso a esa sección.</Alert>}

      <section aria-label="Catálogo">
        <h2 className="eyebrow mb-3 !text-steel-500">Catálogo</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <Stat label="Publicados" value={s.published} icon={PackageCheck} tone="ok" href="/admin/productos?estado=published" />
          <Stat label="En borrador" value={s.draft} icon={FileEdit} href="/admin/productos?estado=draft" />
          <Stat label="Pendientes de fotografías" value={s.pendingPhotos} icon={Camera} tone={s.pendingPhotos ? "warn" : "default"} href="/admin/productos?estado=pending_photos" />
          <Stat label="Pendientes de revisión" value={s.pendingReview} icon={Eye} tone={s.pendingReview ? "warn" : "default"} href="/admin/productos?estado=pending_review" />
          <Stat label="Archivados" value={s.archived} icon={FileEdit} href="/admin/productos?estado=archived" />
        </div>
      </section>

      <section aria-label="Inventario y ventas" className="mt-8">
        <h2 className="eyebrow mb-3 !text-steel-500">Inventario y solicitudes</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <Stat label="Agotados" value={s.outOfStock} icon={PackageX} tone={s.outOfStock ? "err" : "default"} href="/admin/inventario?stock=out" />
          <Stat label="Inventario bajo" value={s.lowStock} icon={AlertTriangle} tone={s.lowStock ? "warn" : "default"} href="/admin/inventario?stock=low" hint="Disponible ≤ stock mínimo" />
          {canOrders && <Stat label="Pedidos recibidos" value={s.ordersTotal} icon={ShoppingBag} href="/admin/pedidos?estado=all" hint={`${s.ordersOpen} abiertos`} />}
          {canQuotes && <Stat label="Cotizaciones pendientes" value={s.quotesPending} icon={ClipboardList} tone={s.quotesPending ? "warn" : "default"} href="/admin/cotizaciones" hint="Nuevas o en revisión" />}
          {canOrders && (
            <Stat
              label="Ventas confirmadas"
              value={s.confirmedSales.length ? s.confirmedSales.map((x) => formatMoney(x.amount, x.currency)).join(" · ") : "—"}
              icon={TrendingUp}
              tone="ok"
              hint={s.confirmedSales.length ? `${s.confirmedSales.reduce((a, x) => a + x.count, 0)} pedidos con pago confirmado` : "Aún no hay pagos confirmados"}
            />
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Requieren atención" description="Productos pendientes de fotos o de revisión." />
          {s.attention.length ? (
            <ul className="divide-y divide-steel-100">
              {s.attention.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/productos/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-steel-25">
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium text-ink">{p.name}</span>
                      <span className="sku">{p.sku}</span>
                    </span>
                    <Badge tone={PRODUCT_STATUS[p.status].tone}>{PRODUCT_STATUS[p.status].label}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-steel-500">Nada pendiente. ¡Buen trabajo!</p>
          )}
        </Card>

        {canOrders && (
          <Card>
            <CardHeader title="Pedidos recientes" action={<Link href="/admin/pedidos" className="text-[13px] font-medium text-climb-700 hover:underline">Ver todos</Link>} />
            {s.recentOrders.length ? (
              <ul className="divide-y divide-steel-100">
                {s.recentOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/pedidos/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-steel-25">
                      <span className="min-w-0">
                        <span className="block font-mono text-[12.5px] text-ink">{o.number}</span>
                        <span className="block truncate text-[12.5px] text-steel-500">{o.company || o.customerName} · {formatDate(o.createdAt)}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[13px] font-medium tabular-nums">{formatMoney(o.total, o.currency)}</span>
                        <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-steel-500">Aún no hay pedidos.</p>
            )}
          </Card>
        )}

        {canQuotes && (
          <Card>
            <CardHeader title="Cotizaciones recientes" action={<Link href="/admin/cotizaciones" className="text-[13px] font-medium text-climb-700 hover:underline">Ver todas</Link>} />
            {s.recentQuotes.length ? (
              <ul className="divide-y divide-steel-100">
                {s.recentQuotes.map((q) => (
                  <li key={q.id}>
                    <Link href={`/admin/cotizaciones/${q.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-steel-25">
                      <span className="min-w-0">
                        <span className="block font-mono text-[12.5px] text-ink">{q.number}</span>
                        <span className="block truncate text-[12.5px] text-steel-500">{q.company || q.customerName} · {q.itemCount} ítems</span>
                      </span>
                      <Badge tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-steel-500">Aún no hay solicitudes.</p>
            )}
          </Card>
        )}
      </div>

      <Card className="mt-8">
        <CardHeader title="Flujo de ingreso de repuestos" description="Del almacén a la tienda, sin programar ni volver a desplegar." />
        <ol className="grid gap-px overflow-hidden rounded-b-lg bg-steel-100 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Ingreso", "Registre llegada, SKU y cantidad.", "/admin/inventario/ingreso"],
            ["Borrador", "Se crea automáticamente sin publicar.", "/admin/productos?estado=draft"],
            ["Fotos y ficha", "Fotografías, especificaciones y documentos.", "/admin/productos?estado=pending_photos"],
            ["Revisión", "Compatibilidad, precio y modalidad.", "/admin/productos?estado=pending_review"],
            ["Publicación", "Visible para búsqueda, compra o cotización.", "/admin/productos?estado=published"],
          ].map(([t, d, href], i) => (
            <li key={t}>
              <Link href={href} className="block h-full bg-white p-4 hover:bg-steel-25">
                <span className="font-mono text-[11px] text-climb-600">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1 text-[14px] font-medium text-ink">{t}</p>
                <p className="mt-0.5 text-[12.5px] text-steel-500">{d}</p>
              </Link>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
