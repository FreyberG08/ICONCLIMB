"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { Brand, Category } from "@/lib/types";
import { deleteBrandAction, deleteCategoryAction, saveBrandAction, saveCategoryAction } from "@/app/admin/actions";
import { slugify } from "@/lib/format";
import { Alert } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";

type CatDraft = { name: string; slug: string; parentId: string; description: string; position: string; active: boolean };

export function CategoryEditor({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [d, setD] = useState<CatDraft>({ name: "", slug: "", parentId: "", description: "", position: "100", active: true });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const tops = categories.filter((c) => !c.parentId);

  function open(c?: Category) {
    setError(null);
    setEditing(c?.id ?? "new");
    setD(c ? { name: c.name, slug: c.slug, parentId: c.parentId ?? "", description: c.description ?? "", position: String(c.position), active: c.active } : { name: "", slug: "", parentId: "", description: "", position: String((tops.length + 1) * 10), active: true });
  }

  const ordered = tops.flatMap((t) => [t, ...categories.filter((c) => c.parentId === t.id)]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="overflow-hidden rounded-lg border border-steel-150 bg-white">
        <table className="table-base">
          <thead><tr><th>Categoría</th><th>Identificador</th><th className="text-right">Productos</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {ordered.map((c) => (
              <tr key={c.id}>
                <td className={c.parentId ? "pl-8" : ""}>{c.parentId && <span className="mr-1.5 text-steel-300">└</span>}<span className="font-medium text-ink">{c.name}</span></td>
                <td className="sku">{c.slug}</td>
                <td className="text-right font-mono tabular-nums">{c.productCount ?? 0}</td>
                <td>{c.active ? <Badge tone="green">Activa</Badge> : <Badge tone="muted">Inactiva</Badge>}</td>
                <td className="text-right whitespace-nowrap">
                  <button type="button" onClick={() => open(c)} className="grid size-8 place-items-center rounded text-steel-500 hover:bg-steel-100 inline-grid" aria-label={`Editar ${c.name}`}><Pencil className="size-4" /></button>
                  <button
                    type="button"
                    className="ml-1 inline-grid size-8 place-items-center rounded text-steel-500 hover:bg-err-50 hover:text-err-600"
                    aria-label={`Eliminar ${c.name}`}
                    onClick={() => {
                      if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
                      start(async () => { const r = await deleteCategoryAction(c.id); if (!r.ok) setError(r.error); else router.refresh(); });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="h-fit rounded-lg border border-steel-150 bg-white p-5">
        {editing ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              start(async () => {
                const r = await saveCategoryAction(editing === "new" ? null : editing, { ...d, slug: d.slug || undefined, position: Number(d.position) || 0 });
                if (!r.ok) return setError(r.error);
                setEditing(null);
                router.refresh();
              });
            }}
          >
            <div className="flex items-center justify-between"><h2 className="font-semibold">{editing === "new" ? "Nueva categoría" : "Editar categoría"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Cerrar"><X className="size-4 text-steel-400" /></button></div>
            <Field label="Nombre" htmlFor="cat-name" required><Input id="cat-name" required value={d.name} onChange={(e) => setD({ ...d, name: e.target.value, slug: editing === "new" ? slugify(e.target.value) : d.slug })} /></Field>
            <Field label="Identificador (URL)" htmlFor="cat-slug"><Input id="cat-slug" className="font-mono" value={d.slug} onChange={(e) => setD({ ...d, slug: slugify(e.target.value) })} /></Field>
            <Field label="Categoría superior" htmlFor="cat-parent" hint="Déjelo vacío para una categoría principal.">
              <Select id="cat-parent" value={d.parentId} onChange={(e) => setD({ ...d, parentId: e.target.value })}>
                <option value="">— Principal —</option>
                {tops.filter((t) => t.id !== editing).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Descripción" htmlFor="cat-desc"><Textarea id="cat-desc" rows={3} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} /></Field>
            <Field label="Orden" htmlFor="cat-pos"><Input id="cat-pos" type="number" value={d.position} onChange={(e) => setD({ ...d, position: e.target.value })} /></Field>
            <Checkbox checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} label="Activa (visible en la tienda)" />
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" className="w-full" loading={pending}>Guardar</Button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-steel-600">Las categorías organizan el catálogo público. Puede crear subcategorías dentro de una principal.</p>
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="button" onClick={() => open()} className="w-full"><Plus className="size-4" /> Nueva categoría</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function BrandEditor({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-5">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const r = await saveBrandAction(null, { name, active: true });
            if (!r.ok) return setError(r.error);
            setName("");
            router.refresh();
          });
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la marca o fabricante" className="max-w-sm" required aria-label="Nueva marca" />
        <Button type="submit" loading={pending}><Plus className="size-4" /> Agregar marca</Button>
      </form>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="overflow-hidden rounded-lg border border-steel-150 bg-white">
        <table className="table-base">
          <thead><tr><th>Marca</th><th className="text-right">Productos</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {brands.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-steel-500">Aún no hay marcas registradas.</td></tr>}
            {brands.map((b) => (
              <tr key={b.id}>
                <td className="font-medium text-ink">{b.name}</td>
                <td className="text-right font-mono tabular-nums">{b.productCount ?? 0}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => start(async () => { const r = await saveBrandAction(b.id, { name: b.name, active: !b.active }); if (!r.ok) setError(r.error); else router.refresh(); })}
                    className="text-left"
                    title="Cambiar estado"
                  >
                    {b.active ? <Badge tone="green">Activa</Badge> : <Badge tone="muted">Inactiva</Badge>}
                  </button>
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      const n = prompt("Nuevo nombre de la marca", b.name);
                      if (!n || n === b.name) return;
                      start(async () => { const r = await saveBrandAction(b.id, { name: n, active: b.active }); if (!r.ok) setError(r.error); else router.refresh(); });
                    }}
                    className="inline-grid size-8 place-items-center rounded text-steel-500 hover:bg-steel-100"
                    aria-label={`Renombrar ${b.name}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm(`¿Eliminar "${b.name}"?`)) start(async () => { const r = await deleteBrandAction(b.id); if (!r.ok) setError(r.error); else router.refresh(); }); }}
                    className="ml-1 inline-grid size-8 place-items-center rounded text-steel-500 hover:bg-err-50 hover:text-err-600"
                    aria-label={`Eliminar ${b.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
