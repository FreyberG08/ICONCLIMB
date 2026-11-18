"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PackagePlus } from "lucide-react";
import type { Category } from "@/lib/types";
import { registerIntakeAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

export function IntakeForm({ categories, canStock }: { categories: Category[]; canStock: boolean }) {
  const router = useRouter();
  const [v, setV] = useState({ sku: "", name: "", quantity: canStock ? "1" : "0", location: "", reason: "Recepción en almacén", categoryId: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: k === "sku" ? e.target.value.toUpperCase().replace(/\s+/g, "-") : e.target.value }));

  return (
    <form
      className="space-y-5 rounded-lg border border-steel-150 bg-white p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await registerIntakeAction({ ...v, quantity: Number(v.quantity) || 0 });
          if (!res.ok) return setError(res.error);
          router.push(`/admin/productos/${res.data.id}?creado=1`);
        });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="SKU asignado" htmlFor="i-sku" required hint="Código interno único del repuesto.">
          <Input id="i-sku" required className="font-mono uppercase" value={v.sku} onChange={set("sku")} />
        </Field>
        <Field label="Nombre provisional" htmlFor="i-name" required>
          <Input id="i-name" required minLength={3} value={v.name} onChange={set("name")} placeholder="Ej.: Tarjeta de maniobra" />
        </Field>
        <Field label="Cantidad recibida" htmlFor="i-qty" required hint={canStock ? undefined : "Su rol no registra existencias; Almacén lo hará."}>
          <Input id="i-qty" type="number" min={0} step={1} className="font-mono" value={v.quantity} onChange={set("quantity")} disabled={!canStock} />
        </Field>
        <Field label="Ubicación física" htmlFor="i-loc">
          <Input id="i-loc" value={v.location} onChange={set("location")} placeholder="Estante, pasillo, caja…" />
        </Field>
        <Field label="Categoría (opcional)" htmlFor="i-cat">
          <Select id="i-cat" value={v.categoryId} onChange={set("categoryId")}>
            <option value="">— Por definir —</option>
            {categories.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Motivo / documento de ingreso" htmlFor="i-reason" required>
          <Input id="i-reason" required minLength={3} value={v.reason} onChange={set("reason")} placeholder="Recepción OC-0001, guía de proveedor…" />
        </Field>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-steel-100 pt-5">
        <p className="text-[12.5px] text-steel-500">Se crea un <strong>borrador</strong> (no visible en la tienda) y una entrada de inventario con su nombre y la fecha.</p>
        <Button type="submit" loading={pending}><PackagePlus className="size-4" /> Registrar ingreso</Button>
      </div>
    </form>
  );
}
