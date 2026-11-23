"use client";

import { ErrorView } from "@/components/ui/error-view";

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} homeHref="/admin" homeLabel="Volver al panel" />;
}
