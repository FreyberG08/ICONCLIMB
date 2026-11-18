"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "../auth-actions";
import { Logo } from "@/components/brand/logo";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, {});
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <form action={action} className="w-full max-w-sm space-y-5">
        <Logo />
        <h1 className="text-2xl font-semibold">Nueva contraseña</h1>
        <Field label="Contraseña" htmlFor="password" hint="Mínimo 10 caracteres.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <Field label="Confirmar contraseña" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={pending}>Guardar contraseña</Button>
      </form>
    </div>
  );
}
