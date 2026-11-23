"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { RotateCcw, UserPlus } from "lucide-react";
import type { Role, StaffUser } from "@/lib/types";
import { createUserAction, inviteUserAction, resetDemoAction, updateUserAction } from "@/app/admin/actions";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { Alert } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { safeCall } from "@/lib/client/safe-call";

const ROLES: Role[] = ["admin", "editor", "warehouse", "reviewer"];

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

const PERM_LABELS: Record<string, string> = {
  "catalog.view": "Ver catálogo e inventario",
  "catalog.edit": "Crear y editar productos",
  "catalog.publish": "Publicar / verificar compatibilidad",
  "catalog.cost": "Ver y editar costos",
  "inventory.manage": "Registrar movimientos",
  "orders.view": "Ver pedidos",
  "orders.manage": "Gestionar pedidos y pagos",
  "quotes.manage": "Gestionar cotizaciones",
  "taxonomy.manage": "Categorías y marcas",
  "data.import": "Importar CSV",
  "data.export": "Exportar CSV",
  "users.manage": "Usuarios y permisos",
  "audit.view": "Ver auditoría",
};

export function UsersPanel({ users, currentId, demo, canInvite }: { users: StaffUser[]; currentId: string; demo: boolean; canInvite: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [invite, setInvite] = useState({ email: "", fullName: "", role: "editor" as Role });
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"password" | "email">("password");
  const [tempPassword, setTempPassword] = useState("");
  useEffect(() => setTempPassword(generatePassword()), []);

  const update = (id: string, patch: Parameters<typeof updateUserAction>[1]) =>
    start(async () => {
      setError(null);
      const r = await safeCall(() => updateUserAction(id, patch));
      if (!r.ok) setError(r.error);
      router.refresh();
    });

  return (
    <div className="space-y-8">
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      <div className="overflow-x-auto rounded-lg border border-steel-150 bg-white">
        <table className="table-base min-w-[720px]">
          <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Alta</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><span className="block font-medium text-ink">{u.fullName || "—"}{u.id === currentId && <span className="ml-2 text-[11px] text-steel-400">(usted)</span>}</span><span className="block text-[12.5px] text-steel-500">{u.email}</span></td>
                <td>
                  <Select value={u.role} disabled={pending || u.id === currentId} onChange={(e) => update(u.id, { role: e.target.value as Role })} className="!py-1.5 w-56" aria-label={`Rol de ${u.email}`}>
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </Select>
                </td>
                <td>
                  <button type="button" disabled={pending || u.id === currentId} onClick={() => update(u.id, { active: !u.active })} title="Activar / desactivar">
                    {u.active ? <Badge tone="green" dot>Activo</Badge> : <Badge tone="amber" dot>Inactivo</Badge>}
                  </button>
                </td>
                <td className="text-[12.5px] text-steel-500">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!demo && (
        <section className="rounded-lg border border-steel-150 bg-white p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold"><UserPlus className="size-4" /> Agregar usuario</h2>
          {canInvite ? (
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  setError(null);
                  setMessage(null);
                  const r = mode === "password"
                    ? await safeCall(() => createUserAction({ ...invite, password: tempPassword }))
                    : await safeCall(() => inviteUserAction(invite));
                  if (!r.ok) return setError(r.error);
                  setMessage(r.data.message);
                  setInvite({ email: "", fullName: "", role: "editor" });
                  setTempPassword(generatePassword());
                  router.refresh();
                });
              }}
            >
              <div role="radiogroup" aria-label="Forma de alta" className="grid gap-2 sm:grid-cols-2">
                {([
                  ["password", "Crear con contraseña", "Inmediato. Usted define la contraseña definitiva del usuario."],
                  ["email", "Enviar invitación por correo", "Requiere correo SMTP propio en Supabase; el plan gratuito solo envía a miembros del equipo."],
                ] as const).map(([value, title, help]) => (
                  <button key={value} type="button" role="radio" aria-checked={mode === value} onClick={() => setMode(value)}
                    className={`rounded-md border px-3 py-2.5 text-left transition-colors ${mode === value ? "border-climb-500 bg-climb-50 ring-1 ring-climb-500" : "border-steel-200 hover:border-steel-300"}`}>
                    <span className="block text-[13px] font-semibold text-ink">{title}</span>
                    <span className="block text-[12px] text-steel-500">{help}</span>
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_220px] sm:items-end">
                <Field label="Nombre" htmlFor="inv-name"><Input id="inv-name" required minLength={2} value={invite.fullName} onChange={(e) => setInvite({ ...invite, fullName: e.target.value })} /></Field>
                <Field label="Correo" htmlFor="inv-email"><Input id="inv-email" type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} /></Field>
                <Field label="Rol" htmlFor="inv-role"><Select id="inv-role" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</Select></Field>
              </div>
              {mode === "password" && (
                <Field label="Contraseña" htmlFor="inv-pass" hint="Escriba la contraseña que usará la persona (mínimo 10 caracteres) o genere una segura. Compártala por un canal seguro.">
                  <div className="flex gap-2">
                    <Input id="inv-pass" required minLength={10} value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} className="font-mono" />
                    <Button type="button" variant="outline" onClick={() => setTempPassword(generatePassword())}>Generar otra</Button>
                    <Button type="button" variant="outline" onClick={() => navigator.clipboard?.writeText(tempPassword)}>Copiar</Button>
                  </div>
                </Field>
              )}
              <Button type="submit" loading={pending}>{mode === "password" ? "Crear usuario" : "Enviar invitación"}</Button>
            </form>
          ) : (
            <p className="mt-2 text-[13.5px] leading-relaxed text-steel-600">
              Para agregar usuarios desde aquí, defina <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> (o <code className="font-mono">SUPABASE_SECRET_KEY</code>) en las variables del servidor (Vercel). Alternativa: cree el usuario en Supabase › Authentication › Users; aparecerá en esta lista como <strong>inactivo</strong> y podrá asignarle un rol y activarlo.
            </p>
          )}
        </section>
      )}

      <section>
        <h2 className="text-[15px] font-semibold">Matriz de permisos</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-steel-150 bg-white">
          <table className="table-base min-w-[720px] text-[13px]">
            <thead><tr><th>Permiso</th>{ROLES.map((r) => <th key={r} className="text-center">{ROLE_LABELS[r]}</th>)}</tr></thead>
            <tbody>
              {Object.entries(PERM_LABELS).map(([p, l]) => (
                <tr key={p}><td>{l}</td>{ROLES.map((r) => <td key={r} className="text-center">{(ROLE_PERMISSIONS[r] as string[]).includes(p) ? <span className="text-ok-600">●</span> : <span className="text-steel-200">○</span>}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {ROLES.map((r) => <li key={r} className="rounded-md border border-steel-150 bg-white p-3 text-[13px]"><strong className="text-ink">{ROLE_LABELS[r]}:</strong> <span className="text-steel-600">{ROLE_DESCRIPTIONS[r]}</span></li>)}
        </ul>
      </section>

      {demo && (
        <section className="rounded-lg border border-warn-600/20 bg-warn-50 p-5">
          <h2 className="text-[15px] font-semibold text-warn-600">Restablecer datos de demostración</h2>
          <p className="mt-1 text-[13px] text-warn-600">Borra productos, pedidos y cotizaciones creados en la demo y vuelve al estado inicial. Deberá iniciar sesión de nuevo.</p>
          <Button type="button" variant="danger" size="sm" className="mt-3" loading={pending} onClick={() => { if (confirm("¿Restablecer todos los datos de demostración?")) start(async () => { await safeCall(() => resetDemoAction()); router.push("/admin/login"); }); }}>
            <RotateCcw className="size-3.5" /> Restablecer demo
          </Button>
        </section>
      )}
    </div>
  );
}
