"use client";

import { useActionState, useState } from "react";
import { login, requestPasswordReset, type AuthState } from "../auth-actions";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm({ next, demo }: { next?: string; demo: boolean }) {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  const [resetState, resetAction, resetPending] = useActionState<AuthState, FormData>(requestPasswordReset, {});

  if (mode === "reset") {
    return (
      <form action={resetAction} className="space-y-5">
        <Field label="Correo electrónico" htmlFor="r-email">
          <Input id="r-email" name="email" type="email" autoComplete="email" required />
        </Field>
        {resetState.error && <Alert tone="error">{resetState.error}</Alert>}
        {resetState.message && <Alert tone="success">{resetState.message}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={resetPending}>Enviar enlace</Button>
        <button type="button" className="w-full text-center text-[13px] text-steel-500 hover:text-ink" onClick={() => setMode("login")}>Volver a iniciar sesión</button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Correo electrónico" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required defaultValue={demo ? "admin@icon.demo" : undefined} />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={6} />
      </Field>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>Ingresar al panel</Button>
      {!demo && (
        <button type="button" className="w-full text-center text-[13px] text-steel-500 hover:text-ink" onClick={() => setMode("reset")}>¿Olvidó su contraseña?</button>
      )}
    </form>
  );
}
