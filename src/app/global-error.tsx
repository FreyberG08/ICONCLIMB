"use client";

// Último recurso: errores en el layout raíz. Debe incluir <html> y <body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f6f7f9", color: "#111821" }}>
        <div style={{ maxWidth: 480, padding: 32, background: "#fff", borderRadius: 12, border: "1px solid #dde2e8", textAlign: "center" }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Algo no salió como esperábamos</h1>
          <p style={{ color: "#4c5663", fontSize: 14 }}>Recargue la página. Si el problema continúa, envíe a soporte este detalle:</p>
          <p style={{ fontFamily: "monospace", fontSize: 12, background: "#f6f7f9", padding: 8, borderRadius: 6, wordBreak: "break-word" }}>{error.digest ?? error.message}</p>
          <button type="button" onClick={reset} style={{ marginTop: 12, height: 40, padding: "0 16px", borderRadius: 6, border: 0, background: "#174d9f", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Reintentar</button>
        </div>
      </body>
    </html>
  );
}
