"use client";

import { Field, Input, Textarea } from "@/components/ui/field";

export interface CustomerDraft {
  name: string;
  company: string;
  taxId: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
}

export const emptyCustomer: CustomerDraft = { name: "", company: "", taxId: "", email: "", phone: "", city: "", address: "", notes: "" };

export function CustomerFields({ value, onChange, withAddress, notesLabel, notesHint }: { value: CustomerDraft; onChange: (v: CustomerDraft) => void; withAddress?: boolean; notesLabel: string; notesHint?: string }) {
  const set = (k: keyof CustomerDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Nombre y apellido" htmlFor="c-name" required>
        <Input id="c-name" autoComplete="name" required value={value.name} onChange={set("name")} />
      </Field>
      <Field label="Empresa" htmlFor="c-company" hint="Opcional">
        <Input id="c-company" autoComplete="organization" value={value.company} onChange={set("company")} />
      </Field>
      <Field label="Correo electrónico" htmlFor="c-email" required hint="Recibirá aquí la confirmación y el seguimiento.">
        <Input id="c-email" type="email" autoComplete="email" required value={value.email} onChange={set("email")} />
      </Field>
      <Field label="Teléfono / WhatsApp" htmlFor="c-phone" required>
        <Input id="c-phone" type="tel" autoComplete="tel" required value={value.phone} onChange={set("phone")} />
      </Field>
      <Field label="Identificación fiscal" htmlFor="c-tax" hint="Opcional · para facturación">
        <Input id="c-tax" value={value.taxId} onChange={set("taxId")} />
      </Field>
      <Field label="Ciudad" htmlFor="c-city">
        <Input id="c-city" autoComplete="address-level2" value={value.city} onChange={set("city")} />
      </Field>
      {withAddress && (
        <Field label="Dirección de entrega" htmlFor="c-address" hint="Opcional · el envío se coordina con un asesor." className="sm:col-span-2">
          <Input id="c-address" autoComplete="street-address" value={value.address} onChange={set("address")} />
        </Field>
      )}
      <Field label={notesLabel} htmlFor="c-notes" hint={notesHint} className="sm:col-span-2">
        <Textarea id="c-notes" rows={4} value={value.notes} onChange={set("notes")} />
      </Field>
    </div>
  );
}

export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
      <label>
        Sitio web
        <input tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
