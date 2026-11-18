"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Archive, BadgeCheck, Camera, CheckCircle2, Circle, Copy, ExternalLink, Eye, Info, Plus, Save, Send, Trash2, Undo2, Upload,
} from "lucide-react";
import type { AdminProduct, Brand, Category, ProductStatus } from "@/lib/types";
import { CURRENCIES } from "@/lib/config";
import { PRODUCT_STATUS } from "@/lib/labels";
import { slugify } from "@/lib/format";
import { duplicateProductAction, saveProduct } from "@/app/admin/actions";
import { uploadProductImage } from "@/lib/client/compress-image";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { ImageManager, PendingImages, type PendingImage } from "./image-manager";
import { DocumentManager } from "./document-manager";
import { MovementButton } from "./movement-dialog";
import { ProductStatusBadge } from "./status-badge";
import { cn } from "@/lib/cn";

interface Perms {
  canEdit: boolean;
  canPublish: boolean;
  canCost: boolean;
  canInventory: boolean;
}

interface Draft {
  sku: string;
  name: string;
  slug: string;
  categoryId: string;
  subcategoryId: string;
  brandId: string;
  model: string;
  reference: string;
  altCodes: string;
  shortDescription: string;
  description: string;
  specs: { label: string; value: string }[];
  compat: { brand: string; model: string; notes: string; verified: boolean }[];
  price: string;
  currency: string;
  saleMode: "direct" | "quote";
  featured: boolean;
  minStock: string;
  location: string;
  internalNotes: string;
  cost: string;
  initialStock: string;
}

function toDraft(p: AdminProduct | null, defaultCurrency: string): Draft {
  return {
    sku: p?.sku ?? "",
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    categoryId: p?.categoryId ?? "",
    subcategoryId: p?.subcategoryId ?? "",
    brandId: p?.brandId ?? "",
    model: p?.model ?? "",
    reference: p?.reference ?? "",
    altCodes: p?.altCodes.join(", ") ?? "",
    shortDescription: p?.shortDescription ?? "",
    description: p?.description ?? "",
    specs: p?.specs.length ? p.specs : [],
    compat: p?.compatibilities.map((c) => ({ brand: c.brand, model: c.model, notes: c.notes ?? "", verified: c.verified })) ?? [],
    price: p?.price != null ? String(p.price) : "",
    currency: p?.currency ?? defaultCurrency,
    saleMode: p?.saleMode ?? "quote",
    featured: p?.featured ?? false,
    minStock: String(p?.minStock ?? 1),
    location: p?.location ?? "",
    internalNotes: p?.internalNotes ?? "",
    cost: p?.cost != null ? String(p.cost) : "",
    initialStock: "0",
  };
}

function toPayload(d: Draft, isNew: boolean, perms: Perms) {
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
  return {
    sku: d.sku,
    slug: d.slug || undefined,
    name: d.name,
    categoryId: d.categoryId || null,
    subcategoryId: d.subcategoryId || null,
    brandId: d.brandId || null,
    model: d.model,
    reference: d.reference,
    altCodes: d.altCodes.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
    shortDescription: d.shortDescription,
    description: d.description,
    specs: d.specs.filter((s) => s.label.trim() && s.value.trim()),
    compatibilities: d.compat.filter((c) => c.brand.trim() && c.model.trim()).map((c) => ({ ...c, notes: c.notes })),
    price: num(d.price),
    currency: d.currency,
    saleMode: d.saleMode,
    featured: d.featured,
    minStock: Number(d.minStock) || 0,
    location: d.location,
    internalNotes: d.internalNotes,
    cost: perms.canCost ? num(d.cost) : undefined,
    initialStock: isNew && perms.canInventory ? Number(d.initialStock) || 0 : undefined,
  };
}

function Section({ title, description, children, id, aside }: { title: string; description?: string; children: React.ReactNode; id?: string; aside?: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-lg border border-steel-150 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-steel-100 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-steel-500">{description}</p>}
        </div>
        {aside}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function ProductForm({
  product,
  categories,
  brands,
  perms,
  defaultCurrency,
  checklist,
}: {
  product: AdminProduct | null;
  categories: Category[];
  brands: Brand[];
  perms: Perms;
  defaultCurrency: string;
  checklist?: { label: string; ok: boolean; required: boolean }[];
}) {
  const router = useRouter();
  const isNew = !product;
  const [d, setD] = useState<Draft>(() => toDraft(product, defaultCurrency));
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const readOnly = !perms.canEdit;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const topCategories = categories.filter((c) => !c.parentId);
  const subcategories = categories.filter((c) => c.parentId && c.parentId === d.categoryId);

  async function submit(target?: ProductStatus, label = "save") {
    setError(null);
    setNotice(null);
    setBusy(label);
    try {
      const res = await saveProduct(product?.id ?? null, toPayload(d, isNew, perms), target);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (isNew) {
        const failed: string[] = [];
        for (const p of pending) {
          try {
            await uploadProductImage(res.data.id, p.file);
          } catch (e) {
            failed.push(`${p.file.name}: ${(e as Error).message}`);
          }
        }
        router.replace(`/admin/productos/${res.data.id}?creado=1${failed.length ? "&fotos=error" : ""}`);
        return;
      }
      setNotice(target ? `Guardado · estado: ${PRODUCT_STATUS[target].label}` : "Cambios guardados");
      if (window.location.search) router.replace(`/admin/productos/${product!.id}`, { scroll: false });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const status = product?.status ?? "draft";
  const required = checklist?.filter((c) => c.required) ?? [];
  const publishReady = required.every((c) => c.ok);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(undefined, "save");
      }}
      className="grid gap-6 xl:grid-cols-[1fr_340px]"
    >
      <div className="min-w-0 space-y-6">
        {error && <Alert tone="error" title="No se pudo guardar">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {readOnly && <Alert tone="info">Su rol permite consultar esta ficha, pero no editarla.</Alert>}

        <fieldset disabled={readOnly} className="space-y-6">
          <Section title="Identificación" description="Datos que permiten encontrar el repuesto por nombre, código o referencia.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Nombre comercial" htmlFor="name" required className="md:col-span-2">
                <Input
                  id="name"
                  required
                  minLength={3}
                  maxLength={160}
                  value={d.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setD((x) => ({ ...x, name, slug: slugTouched ? x.slug : slugify(`${name}-${x.sku}`) }));
                  }}
                />
              </Field>
              <Field label="SKU" htmlFor="sku" required hint="Único. Mayúsculas, números, guiones o puntos.">
                <Input
                  id="sku"
                  required
                  value={d.sku}
                  className="font-mono uppercase"
                  onChange={(e) => {
                    const sku = e.target.value.toUpperCase().replace(/\s+/g, "-");
                    setD((x) => ({ ...x, sku, slug: slugTouched ? x.slug : slugify(`${x.name}-${sku}`) }));
                  }}
                />
              </Field>
              <Field label="URL pública" htmlFor="slug" hint={<>/producto/<span className="font-mono">{d.slug || "…"}</span></>}>
                <Input id="slug" value={d.slug} className="font-mono" onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
              </Field>
              <Field label="Categoría" htmlFor="cat" hint="Obligatoria para publicar.">
                <Select id="cat" value={d.categoryId} onChange={(e) => setD((x) => ({ ...x, categoryId: e.target.value, subcategoryId: "" }))}>
                  <option value="">— Seleccione —</option>
                  {topCategories.map((c) => <option key={c.id} value={c.id}>{c.name}{!c.active ? " (inactiva)" : ""}</option>)}
                </Select>
              </Field>
              <Field label="Subcategoría" htmlFor="subcat" hint={subcategories.length ? undefined : "Cree subcategorías en Catálogo › Categorías."}>
                <Select id="subcat" value={d.subcategoryId} onChange={(e) => set("subcategoryId", e.target.value)} disabled={!subcategories.length}>
                  <option value="">— Ninguna —</option>
                  {subcategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Marca / fabricante" htmlFor="brand">
                <Select id="brand" value={d.brandId} onChange={(e) => set("brandId", e.target.value)}>
                  <option value="">— Sin marca —</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label="Modelo" htmlFor="model">
                <Input id="model" maxLength={120} value={d.model} onChange={(e) => set("model", e.target.value)} />
              </Field>
              <Field label="Referencia original" htmlFor="ref" hint="Número de parte del fabricante.">
                <Input id="ref" maxLength={120} className="font-mono" value={d.reference} onChange={(e) => set("reference", e.target.value)} />
              </Field>
              <Field label="Códigos alternativos" htmlFor="alt" hint="Separados por coma. También se usan en la búsqueda.">
                <Input id="alt" className="font-mono" value={d.altCodes} onChange={(e) => set("altCodes", e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Descripción">
            <div className="space-y-5">
              <Field label="Descripción corta" htmlFor="short" hint={`${d.shortDescription.length}/280 · aparece bajo el nombre y en buscadores.`}>
                <Textarea id="short" rows={2} maxLength={280} value={d.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
              </Field>
              <Field label="Descripción detallada" htmlFor="desc">
                <Textarea id="desc" rows={6} maxLength={8000} value={d.description} onChange={(e) => set("description", e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section
            title="Características técnicas"
            description="Pares atributo / valor. Ej.: Tensión · 24 VDC."
            aside={<Button type="button" size="sm" variant="outline" onClick={() => set("specs", [...d.specs, { label: "", value: "" }])}><Plus className="size-3.5" /> Agregar</Button>}
          >
            {d.specs.length === 0 ? (
              <p className="text-sm text-steel-500">Sin características. Agregue al menos las principales antes de publicar.</p>
            ) : (
              <ul className="space-y-2">
                {d.specs.map((s, i) => (
                  <li key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                    <Input aria-label="Atributo" placeholder="Atributo" value={s.label} onChange={(e) => set("specs", d.specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <Input aria-label="Valor" placeholder="Valor" value={s.value} onChange={(e) => set("specs", d.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                    <button type="button" onClick={() => set("specs", d.specs.filter((_, j) => j !== i))} className="grid size-10 place-items-center rounded-md text-steel-400 hover:bg-err-50 hover:text-err-600" aria-label="Quitar característica"><Trash2 className="size-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Compatibilidades"
            description="Solo las marcadas como verificadas se publican. Nunca registre compatibilidades no confirmadas como verificadas."
            aside={<Button type="button" size="sm" variant="outline" onClick={() => set("compat", [...d.compat, { brand: "", model: "", notes: "", verified: false }])}><Plus className="size-3.5" /> Agregar</Button>}
          >
            {d.compat.length === 0 ? (
              <p className="text-sm text-steel-500">Sin compatibilidades registradas. La ficha pública invitará al cliente a consultar.</p>
            ) : (
              <ul className="space-y-3">
                {d.compat.map((c, i) => (
                  <li key={i} className={cn("grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_1fr_1.4fr_auto_auto] md:items-center", c.verified ? "border-ok-600/25 bg-ok-50/40" : "border-steel-150")}>
                    <Input aria-label="Marca del equipo" placeholder="Marca del equipo" value={c.brand} onChange={(e) => set("compat", d.compat.map((x, j) => (j === i ? { ...x, brand: e.target.value } : x)))} />
                    <Input aria-label="Modelo del equipo" placeholder="Modelo" value={c.model} onChange={(e) => set("compat", d.compat.map((x, j) => (j === i ? { ...x, model: e.target.value } : x)))} />
                    <Input aria-label="Notas" placeholder="Notas (opcional)" value={c.notes} onChange={(e) => set("compat", d.compat.map((x, j) => (j === i ? { ...x, notes: e.target.value } : x)))} />
                    <label className={cn("flex items-center gap-1.5 text-[12.5px] whitespace-nowrap", !perms.canPublish && "opacity-60")} title={perms.canPublish ? undefined : "Solo un revisor técnico puede verificar"}>
                      <input type="checkbox" className="accent-ok-600" checked={c.verified} disabled={!perms.canPublish} onChange={(e) => set("compat", d.compat.map((x, j) => (j === i ? { ...x, verified: e.target.checked } : x)))} />
                      <BadgeCheck className="size-3.5 text-ok-600" /> Verificada
                    </label>
                    <button type="button" onClick={() => set("compat", d.compat.filter((_, j) => j !== i))} className="grid size-9 place-items-center rounded-md text-steel-400 hover:bg-err-50 hover:text-err-600" aria-label="Quitar compatibilidad"><Trash2 className="size-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </fieldset>

        <Section id="fotos" title="Fotografías" description="Cargue varias fotos desde la computadora o el teléfono. Defina la principal y el orden.">
          {readOnly ? (
            <p className="text-sm text-steel-500">{product?.images.length ?? 0} fotografías.</p>
          ) : product ? (
            <ImageManager productId={product.id} initial={product.images} />
          ) : (
            <PendingImages items={pending} onChange={setPending} />
          )}
        </Section>

        <Section title="Documentación técnica" description="Fichas, manuales o certificados. Marque solo los documentos autorizados para descarga pública.">
          {product ? (
            readOnly ? <p className="text-sm text-steel-500">{product.documents.length} documentos.</p> : <DocumentManager productId={product.id} initial={product.documents} />
          ) : (
            <p className="flex items-center gap-2 text-sm text-steel-500"><Upload className="size-4" /> Disponible después de guardar el borrador.</p>
          )}
        </Section>

        <fieldset disabled={readOnly}>
          <Section title="Notas internas" description="Solo visibles para el personal.">
            <Textarea rows={3} maxLength={2000} value={d.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} aria-label="Notas internas" />
          </Section>
        </fieldset>
      </div>

      {/* Columna lateral */}
      <div className="space-y-6 xl:sticky xl:top-6 xl:h-fit">
        <section className="rounded-lg border border-steel-150 bg-white">
          <header className="flex items-center justify-between border-b border-steel-100 px-5 py-4">
            <h2 className="text-[15px] font-semibold">Publicación</h2>
            <ProductStatusBadge status={status} />
          </header>
          <div className="space-y-3 p-5">
            {checklist && (
              <ul className="space-y-1.5 pb-2">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-[13px]">
                    {c.ok ? <CheckCircle2 className="size-4 text-ok-600" /> : <Circle className={cn("size-4", c.required ? "text-err-600" : "text-steel-300")} />}
                    <span className={c.ok ? "text-steel-600" : c.required ? "text-err-600" : "text-steel-500"}>{c.label}{c.required && !c.ok ? " (obligatorio)" : ""}</span>
                  </li>
                ))}
              </ul>
            )}
            {!readOnly && (
              <>
                <Button type="submit" className="w-full" variant="dark" loading={busy === "save"}>
                  <Save className="size-4" /> {isNew ? "Guardar borrador" : "Guardar cambios"}
                </Button>
                {status !== "published" && status !== "pending_photos" && (
                  <Button type="button" variant="outline" className="w-full" loading={busy === "photos"} onClick={() => submit("pending_photos", "photos")}>
                    <Camera className="size-4" /> {isNew ? "Guardar · pendiente de fotos" : "Marcar pendiente de fotos"}
                  </Button>
                )}
                {status !== "published" && status !== "pending_review" && (
                  <Button type="button" variant="outline" className="w-full" loading={busy === "review"} onClick={() => submit("pending_review", "review")}>
                    <Send className="size-4" /> {isNew ? "Guardar y enviar a revisión" : "Enviar a revisión"}
                  </Button>
                )}
              </>
            )}
            {perms.canPublish && !isNew && status !== "published" && (
              <Button type="button" className="w-full" loading={busy === "publish"} disabled={!publishReady} onClick={() => submit("published", "publish")}>
                <CheckCircle2 className="size-4" /> Aprobar y publicar
              </Button>
            )}
            {perms.canPublish && isNew && (
              <p className="flex gap-2 text-[12px] text-steel-500"><Info className="mt-0.5 size-3.5 shrink-0" /> Guarde primero: un producto nuevo se revisa antes de publicarse.</p>
            )}
            {perms.canPublish && status === "published" && (
              <Button type="button" variant="outline" className="w-full" loading={busy === "unpublish"} onClick={() => submit("draft", "unpublish")}>
                <Undo2 className="size-4" /> Despublicar (volver a borrador)
              </Button>
            )}
            {!readOnly && !isNew && status !== "archived" && (status !== "published" || perms.canPublish) && (
              <Button type="button" variant="ghost" className="w-full text-steel-500" loading={busy === "archive"} onClick={() => { if (confirm("¿Archivar este producto? Dejará de aparecer en listados activos.")) submit("archived", "archive"); }}>
                <Archive className="size-4" /> Archivar
              </Button>
            )}
            {!readOnly && status === "archived" && (
              <Button type="button" variant="ghost" className="w-full" onClick={() => submit("draft", "restore")} loading={busy === "restore"}>
                <Undo2 className="size-4" /> Restaurar como borrador
              </Button>
            )}
          </div>
          {product && (
            <div className="flex flex-wrap gap-2 border-t border-steel-100 px-5 py-3">
              <Link href={`/admin/productos/${product.id}/vista-previa`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-climb-700 hover:underline"><Eye className="size-3.5" /> Vista previa</Link>
              {status === "published" && <Link href={`/producto/${product.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-climb-700 hover:underline"><ExternalLink className="size-3.5" /> Ver en tienda</Link>}
              {perms.canEdit && (
                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-steel-600 hover:text-ink"
                  onClick={() => start(async () => {
                    const r = await duplicateProductAction(product.id);
                    if (r.ok) router.push(`/admin/productos/${r.data.id}?duplicado=1`);
                    else setError(r.error);
                  })}
                >
                  <Copy className="size-3.5" /> Duplicar
                </button>
              )}
            </div>
          )}
        </section>

        <fieldset disabled={readOnly}>
          <section className="rounded-lg border border-steel-150 bg-white">
            <header className="border-b border-steel-100 px-5 py-4"><h2 className="text-[15px] font-semibold">Comercial</h2></header>
            <div className="space-y-5 p-5">
              <div role="radiogroup" aria-label="Modalidad" className="grid grid-cols-2 gap-2">
                {(["direct", "quote"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={d.saleMode === m}
                    onClick={() => set("saleMode", m)}
                    className={cn("rounded-md border px-3 py-2.5 text-left transition-colors", d.saleMode === m ? "border-climb-500 bg-climb-50 ring-1 ring-climb-500" : "border-steel-200 hover:border-steel-300")}
                  >
                    <span className="block text-[13px] font-semibold text-ink">{m === "direct" ? "Compra directa" : "Cotización"}</span>
                    <span className="block text-[11.5px] text-steel-500">{m === "direct" ? "Precio publicado y carrito" : "Sin precio público"}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_96px] gap-2">
                <Field label="Precio de venta" htmlFor="price" required={d.saleMode === "direct"} hint={d.saleMode === "quote" ? "Opcional · no se muestra al público." : "Precio autorizado por unidad."}>
                  <Input id="price" type="number" inputMode="decimal" min={0} step="0.01" className="font-mono" value={d.price} onChange={(e) => set("price", e.target.value)} />
                </Field>
                <Field label="Moneda" htmlFor="cur">
                  <Select id="cur" value={d.currency} onChange={(e) => set("currency", e.target.value)}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
              </div>
              {perms.canCost ? (
                <Field label="Costo interno" htmlFor="cost" hint="Protegido · nunca se muestra en la tienda.">
                  <Input id="cost" type="number" inputMode="decimal" min={0} step="0.01" className="font-mono" value={d.cost} onChange={(e) => set("cost", e.target.value)} />
                </Field>
              ) : (
                <p className="text-[12.5px] text-steel-500">El costo interno solo es visible para revisores y administradores.</p>
              )}
              <Checkbox checked={d.featured} onChange={(e) => set("featured", e.target.checked)} label="Destacar en la página de inicio" />
            </div>
          </section>
        </fieldset>

        <fieldset disabled={readOnly}>
          <section className="rounded-lg border border-steel-150 bg-white">
            <header className="flex items-center justify-between border-b border-steel-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold">Inventario</h2>
              {product && <Link href={`/admin/inventario/movimientos?producto=${product.id}`} className="text-[12.5px] font-medium text-climb-700 hover:underline">Historial</Link>}
            </header>
            <div className="space-y-5 p-5">
              {product ? (
                <>
                  <div className="grid grid-cols-3 divide-x divide-steel-150 rounded-md border border-steel-150 text-center">
                    <div className="p-2.5"><p className="font-mono text-lg font-semibold tabular-nums">{product.onHand}</p><p className="text-[11px] text-steel-500">Físico</p></div>
                    <div className="p-2.5"><p className="font-mono text-lg font-semibold tabular-nums text-climb-600">{product.reserved}</p><p className="text-[11px] text-steel-500">Reservado</p></div>
                    <div className="p-2.5"><p className="font-mono text-lg font-semibold tabular-nums">{product.onHand - product.reserved}</p><p className="text-[11px] text-steel-500">Disponible</p></div>
                  </div>
                  {perms.canInventory ? (
                    <MovementButton productId={product.id} sku={product.sku} name={product.name} onHand={product.onHand} reserved={product.reserved} label="Registrar movimiento" />
                  ) : (
                    <p className="text-[12.5px] text-steel-500">Las existencias se modifican desde Almacén mediante movimientos registrados.</p>
                  )}
                </>
              ) : perms.canInventory ? (
                <Field label="Existencia inicial" htmlFor="init" hint="Se registra como movimiento de entrada «Inventario inicial».">
                  <Input id="init" type="number" min={0} step={1} className="font-mono" value={d.initialStock} onChange={(e) => set("initialStock", e.target.value)} />
                </Field>
              ) : (
                <p className="text-[12.5px] text-steel-500">Almacén registrará la existencia inicial después de crear el producto.</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Stock mínimo" htmlFor="min" hint="Alerta de inventario bajo.">
                  <Input id="min" type="number" min={0} step={1} className="font-mono" value={d.minStock} onChange={(e) => set("minStock", e.target.value)} />
                </Field>
                <Field label="Ubicación física" htmlFor="loc" hint="Interna.">
                  <Input id="loc" maxLength={120} value={d.location} onChange={(e) => set("location", e.target.value)} placeholder="Estante A-3" />
                </Field>
              </div>
            </div>
          </section>
        </fieldset>
      </div>
    </form>
  );
}
