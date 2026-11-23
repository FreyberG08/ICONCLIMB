"use client";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Ejecuta una acción del servidor sin dejar caer la página: un fallo de red, un
 * tiempo de espera agotado o una respuesta inesperada se convierten en un aviso.
 */
export async function safeCall<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await fn();
  } catch (e) {
    console.error("[AICON] acción fallida", e);
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    return {
      ok: false,
      error: offline
        ? "Sin conexión a internet. Verifique su red e intente de nuevo."
        : "No se pudo completar la operación (el servidor no respondió como se esperaba). Recargue la página e intente de nuevo.",
    };
  }
}
