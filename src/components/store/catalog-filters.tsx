"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import type { Brand, Category } from "@/lib/types";
import { cn } from "@/lib/cn";

export interface FilterState {
  q?: string;
  categoria?: string;
  marca: string[];
  disponibilidad?: string;
  modo?: string;
  min?: string;
  max?: string;
  orden?: string;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-steel-150 py-5 first:pt-0 last:border-0">
      <legend className="eyebrow mb-3 !text-steel-500">{title}</legend>
      <div className="space-y-1">{children}</div>
    </fieldset>
  );
}

function Option({ type, name, value, checked, label, count }: { type: "radio" | "checkbox"; name: string; value: string; checked: boolean; label: string; count?: number }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13.5px] transition-colors hover:bg-steel-50", checked ? "text-ink font-medium" : "text-steel-600")}>
      <input type={type} name={name} value={value} defaultChecked={checked} className="size-3.5 accent-climb-600" />
      <span className="flex-1">{label}</span>
      {count != null && <span className="font-mono text-[11px] text-steel-400">{count}</span>}
    </label>
  );
}

/** Filtros del catálogo: formulario GET (funciona sin JavaScript) con envío automático. */
export function CatalogFilters({ state, categories, brands }: { state: FilterState; categories: Category[]; brands: Brand[] }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);

  function submit() {
    const f = form.current;
    if (!f) return;
    const data = new FormData(f);
    const params = new URLSearchParams();
    for (const [k, v] of data.entries()) {
      if (typeof v === "string" && v !== "") params.append(k, v);
    }
    router.push(`/catalogo${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  return (
    <form ref={form} action="/catalogo" onChange={(e) => { if ((e.target as unknown as HTMLInputElement).type !== "number") submit(); }} onSubmit={(e) => { e.preventDefault(); submit(); }}>
      {state.q && <input type="hidden" name="q" value={state.q} />}
      {state.orden && <input type="hidden" name="orden" value={state.orden} />}

      <Group title="Categoría">
        <Option type="radio" name="categoria" value="" checked={!state.categoria} label="Todas" />
        {categories.map((c) => (
          <Option key={c.id} type="radio" name="categoria" value={c.slug} checked={state.categoria === c.slug} label={c.name} count={c.productCount} />
        ))}
      </Group>

      <Group title="Modalidad">
        <Option type="radio" name="modo" value="" checked={!state.modo} label="Todas" />
        <Option type="radio" name="modo" value="direct" checked={state.modo === "direct"} label="Compra directa" />
        <Option type="radio" name="modo" value="quote" checked={state.modo === "quote"} label="Solicitud de cotización" />
      </Group>

      <Group title="Disponibilidad">
        <Option type="radio" name="disponibilidad" value="" checked={!state.disponibilidad} label="Todas" />
        <Option type="radio" name="disponibilidad" value="available" checked={state.disponibilidad === "available"} label="Disponible" />
        <Option type="radio" name="disponibilidad" value="unavailable" checked={state.disponibilidad === "unavailable"} label="Agotado / bajo pedido" />
      </Group>

      {brands.length > 0 && (
        <Group title="Fabricante">
          {brands.map((b) => (
            <Option key={b.id} type="checkbox" name="marca" value={b.slug} checked={state.marca.includes(b.slug)} label={b.name} count={b.productCount} />
          ))}
        </Group>
      )}

      <Group title="Precio (compra directa)">
        <div className="flex items-center gap-2 px-1">
          <input type="number" name="min" min={0} step="0.01" defaultValue={state.min} placeholder="Mín." aria-label="Precio mínimo" className="field-input !py-1.5 text-sm" />
          <span className="text-steel-400">–</span>
          <input type="number" name="max" min={0} step="0.01" defaultValue={state.max} placeholder="Máx." aria-label="Precio máximo" className="field-input !py-1.5 text-sm" />
        </div>
        <button type="submit" className="mt-2 ml-1 text-[13px] font-medium text-climb-700 hover:underline">Aplicar precio</button>
      </Group>
    </form>
  );
}

export function SortSelect({ value, params }: { value: string; params: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-[13px] text-steel-500">
      <span className="hidden sm:inline">Ordenar por</span>
      <select
        defaultValue={value}
        onChange={(e) => {
          const p = new URLSearchParams(params);
          p.delete("pagina");
          if (e.target.value === "relevance") p.delete("orden");
          else p.set("orden", e.target.value);
          router.push(`/catalogo${p.size ? `?${p}` : ""}`, { scroll: false });
        }}
        className="h-9 rounded-md border border-steel-200 bg-white px-2 text-[13px] text-ink focus:border-climb-500 focus:outline-none"
      >
        <option value="relevance">Relevancia</option>
        <option value="newest">Más recientes</option>
        <option value="name">Nombre (A–Z)</option>
        <option value="price_asc">Precio: menor a mayor</option>
        <option value="price_desc">Precio: mayor a menor</option>
      </select>
    </label>
  );
}
