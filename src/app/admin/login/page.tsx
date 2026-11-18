import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Alert } from "@/components/ui/misc";
import { isDemoMode } from "@/lib/config";
import { getSession } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/permissions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Acceso al panel", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; inactive?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await getSession();
  if (session.status === "active") redirect("/admin");

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-climb-950 lg:block">
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, rgb(255 255 255 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.04) 1px, transparent 1px)", backgroundSize: "32px 32px" }} aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo inverted />
          <div>
            <p className="eyebrow !text-climb-300">Panel administrativo</p>
            <h1 className="mt-4 max-w-md text-4xl leading-tight font-semibold !text-white">Catálogo, inventario y solicitudes en un solo lugar.</h1>
            <p className="mt-4 max-w-md text-white/60">Publique repuestos sin programar, controle existencias con trazabilidad y atienda pedidos y cotizaciones.</p>
          </div>
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-white/40"><ShieldCheck className="size-4" /> ACCESO RESTRINGIDO A PERSONAL AUTORIZADO</p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="lg:hidden"><Logo /></Link>
          <h2 className="mt-8 text-2xl font-semibold lg:mt-0">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-steel-500">Ingrese con su cuenta corporativa.</p>
          <div className="mt-8 space-y-4">
            {sp.inactive && <Alert tone="warning" title="Cuenta pendiente de activación">Un administrador debe activar su cuenta y asignarle un rol.</Alert>}
            {sp.error === "link" && <Alert tone="error">El enlace expiró o no es válido. Solicite uno nuevo.</Alert>}
            <LoginForm next={sp.next} demo={isDemoMode} />
          </div>
          {isDemoMode && (
            <div className="mt-10 rounded-lg border border-warn-600/20 bg-warn-50 p-4 text-[13px] text-warn-600">
              <p className="font-semibold">Modo demostración</p>
              <p className="mt-1">Contraseña común: valor de <code className="font-mono">DEMO_PASSWORD</code> (por defecto <code className="font-mono">icon-demo-2026</code>). Cuentas:</p>
              <ul className="mt-2 space-y-0.5 font-mono text-[12px]">
                <li>admin@icon.demo — {ROLE_LABELS.admin}</li>
                <li>editor@icon.demo — {ROLE_LABELS.editor}</li>
                <li>almacen@icon.demo — {ROLE_LABELS.warehouse}</li>
                <li>revisor@icon.demo — {ROLE_LABELS.reviewer}</li>
              </ul>
            </div>
          )}
          <Link href="/" className="mt-10 block text-center text-[13px] text-steel-500 hover:text-ink">← Volver a la tienda</Link>
        </div>
      </div>
    </div>
  );
}
