import Papa from "papaparse";
import { getAdminRepo } from "@/lib/data";
import { EXPORT_COLUMNS } from "@/lib/data/shared";
import { jsonError } from "../_upload";

// Exportación del inventario y catálogo a CSV (auditorías y respaldos).
export async function GET() {
  try {
    const repo = await getAdminRepo("data.export");
    const rows = await repo.exportProducts();
    // Neutraliza fórmulas al abrir en hojas de cálculo (inyección CSV).
    const safe = rows.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v])),
    );
    const csv = Papa.unparse({ fields: [...EXPORT_COLUMNS], data: safe.map((r) => EXPORT_COLUMNS.map((c) => r[c] ?? "")) });
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    return new Response("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="icon-inventario-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
