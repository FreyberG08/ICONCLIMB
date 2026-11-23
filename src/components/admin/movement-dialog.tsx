"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeftRight, X } from "lucide-react";
import { recordMovementAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { safeCall } from "@/lib/client/safe-call";

const HELP = {
  entry: "Unidades que ingresan al almacén (compra, devolución, reposición).",
  exit: "Unidades que salen sin pedido web (venta en mostrador, uso interno, merma).",
  adjustment: "Indique la existencia física CONTADA. El sistema calcula la diferencia.",
};

export function MovementButton({ productId, sku, name, onHand, reserved, label = "Movimiento", variant = "outline" }: { productId: string; sku: string; name: string; onHand: number; reserved: number; label?: string; variant?: "outline" | "ghost" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" variant={variant} onClick={() => setOpen(true)}>
        <ArrowLeftRight className="size-3.5" /> {label}
      </Button>
      {open && <MovementDialog productId={productId} sku={sku} name={name} onHand={onHand} reserved={reserved} onClose={() => setOpen(false)} />}
    </>
  );
}

function MovementDialog({ productId, sku, name, onHand, reserved, onClose }: { productId: string; sku: string; name: string; onHand: number; reserved: number; onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<"entry" | "exit" | "adjustment">("entry");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const n = Number(qty);
  const valid = qty !== "" && Number.isInteger(n) && n >= 0;
  const nextOnHand = !valid ? null : type === "entry" ? onHand + n : type === "exit" ? onHand - n : n;

  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(520px,calc(100vw-2rem))] rounded-xl border border-steel-150 p-0 shadow-[var(--shadow-raised)] backdrop:bg-ink/30 backdrop:backdrop-blur-sm">
      <form
        className="space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await safeCall(() => recordMovementAction({ productId, type, quantity: n, reason, reference }));
            if (!res.ok) return setError(res.error);
            ref.current?.close();
            router.refresh();
          });
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Registrar movimiento</h2>
            <p className="mt-0.5 text-[13px] text-steel-500"><span className="sku">{sku}</span> · {name}</p>
          </div>
          <button type="button" onClick={() => ref.current?.close()} className="grid size-8 place-items-center rounded-md hover:bg-steel-100" aria-label="Cerrar"><X className="size-4" /></button>
        </div>
        <div className="grid grid-cols-3 divide-x divide-steel-150 rounded-lg border border-steel-150 text-center">
          <div className="p-3"><p className="font-mono text-lg font-semibold tabular-nums">{onHand}</p><p className="text-[11.5px] text-steel-500">Físico</p></div>
          <div className="p-3"><p className="font-mono text-lg font-semibold tabular-nums text-climb-600">{reserved}</p><p className="text-[11.5px] text-steel-500">Reservado</p></div>
          <div className="p-3"><p className="font-mono text-lg font-semibold tabular-nums">{onHand - reserved}</p><p className="text-[11.5px] text-steel-500">Disponible</p></div>
        </div>
        <Field label="Tipo de movimiento" htmlFor="mv-type" hint={HELP[type]}>
          <Select id="mv-type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="entry">Entrada</option>
            <option value="exit">Salida</option>
            <option value="adjustment">Ajuste por conteo físico</option>
          </Select>
        </Field>
        <Field label={type === "adjustment" ? "Existencia física contada" : "Cantidad"} htmlFor="mv-qty" required>
          <Input id="mv-qty" type="number" inputMode="numeric" min={type === "adjustment" ? 0 : 1} step={1} required value={qty} onChange={(e) => setQty(e.target.value)} className="font-mono" />
        </Field>
        <Field label="Motivo" htmlFor="mv-reason" required hint="Quedará registrado con fecha y responsable.">
          <Input id="mv-reason" required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: Recepción orden de compra, conteo mensual…" />
        </Field>
        <Field label="Referencia" htmlFor="mv-ref" hint="Opcional · factura, guía, orden de compra.">
          <Input id="mv-ref" maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        {nextOnHand != null && (
          <p className={`rounded-md px-3 py-2 text-[13px] ${nextOnHand < reserved ? "bg-err-50 text-err-600" : "bg-steel-50 text-steel-600"}`}>
            Existencia física resultante: <strong className="font-mono">{nextOnHand}</strong>
            {nextOnHand < reserved && " — no puede quedar por debajo de lo reservado."}
          </p>
        )}
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => ref.current?.close()}>Cancelar</Button>
          <Button type="submit" loading={pending} disabled={!valid || reason.trim().length < 3}>Registrar</Button>
        </div>
      </form>
    </dialog>
  );
}
