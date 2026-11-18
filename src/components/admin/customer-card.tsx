import { Mail, MapPin, Phone } from "lucide-react";
import type { CustomerInput } from "@/lib/types";
import { whatsappLinkFor } from "@/lib/whatsapp";

export function CustomerCard({ c, number }: { c: CustomerInput; number: string }) {
  const wa = whatsappLinkFor(c.phone, `Hola ${c.name.split(" ")[0]}, le escribimos de ICON sobre su solicitud ${number}.`);
  return (
    <div className="space-y-3 text-[13.5px]">
      <div>
        <p className="font-semibold text-ink">{c.name}</p>
        {c.company && <p className="text-steel-600">{c.company}</p>}
        {c.taxId && <p className="sku">ID fiscal: {c.taxId}</p>}
      </div>
      <p className="flex items-center gap-2"><Mail className="size-3.5 text-steel-400" /><a className="text-climb-700 hover:underline" href={`mailto:${c.email}?subject=${encodeURIComponent(`ICON · ${number}`)}`}>{c.email}</a></p>
      <p className="flex items-center gap-2"><Phone className="size-3.5 text-steel-400" /><a className="hover:underline" href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>{c.phone}</a>{wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="ml-1 rounded bg-ok-50 px-1.5 py-0.5 text-[11.5px] font-medium text-ok-600">WhatsApp</a>}</p>
      {(c.city || c.address) && <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-3.5 text-steel-400" /><span>{[c.address, c.city].filter(Boolean).join(", ")}</span></p>}
      {c.notes && <div className="rounded-md bg-steel-50 p-3 whitespace-pre-line text-steel-700"><p className="eyebrow mb-1 !text-steel-500">Observaciones del cliente</p>{c.notes}</div>}
    </div>
  );
}
