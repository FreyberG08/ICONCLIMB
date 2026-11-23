"use client";

import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { importProductsAction } from "@/app/admin/actions";
import type { ImportReport } from "@/lib/types";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { safeCall } from "@/lib/client/safe-call";

export const TEMPLATE_COLUMNS = ["sku", "name", "category", "brand", "model", "reference", "alt_codes", "short_description", "description", "price", "currency", "sale_mode", "min_stock", "location", "initial_stock"];

const TEMPLATE = [
  TEMPLATE_COLUMNS.join(","),
  'EJ-0001,"Nombre del repuesto",Tarjetas y electrónica,Marca X,Modelo Y,REF-123,"COD-A|COD-B","Descripción corta","Descripción larga",120.50,USD,directa,2,Estante A-1,5',
  'EJ-0002,"Repuesto bajo cotización",Repuestos especiales y bajo pedido,,,,,,,,USD,cotizacion,0,,0',
].join("\n");

export function ImportPanel({ canImport, canExport }: { canImport: boolean; canExport: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [update, setUpdate] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function downloadTemplate() {
    const blob = new Blob(["﻿" + TEMPLATE], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "plantilla-productos-icon.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {canImport && (
        <section className="rounded-lg border border-steel-150 bg-white p-5 sm:p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">Importar productos desde CSV</h2>
              <p className="mt-1 max-w-2xl text-[13px] text-steel-500">
                Los productos nuevos se crean en <strong>borrador</strong> (nunca se publican automáticamente). Columnas obligatorias: <code className="font-mono">sku</code> y <code className="font-mono">name</code>. Categoría por nombre exacto; las marcas nuevas se crean automáticamente. Códigos alternativos separados por <code className="font-mono">|</code>.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}><Download className="size-3.5" /> Plantilla CSV</Button>
          </div>

          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-steel-200 bg-steel-25 px-6 py-8 text-center hover:border-steel-300">
            <FileSpreadsheet className="size-6 text-steel-400" />
            <span className="mt-2 text-sm font-medium text-ink">{fileName || "Seleccione un archivo .csv (UTF-8)"}</span>
            <span className="text-[12px] text-steel-500">Separador coma o punto y coma · máx. 2000 filas</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setReport(null);
                setError(null);
                setParseError(null);
                if (!f) return;
                setFileName(f.name);
                Papa.parse<Record<string, string>>(f, {
                  header: true,
                  skipEmptyLines: "greedy",
                  transformHeader: (h) => h.trim().toLowerCase(),
                  complete: (res) => {
                    const fields = res.meta.fields ?? [];
                    if (!fields.includes("sku") || !fields.includes("name")) {
                      setRows([]);
                      setParseError("El archivo debe incluir las columnas «sku» y «name». Descargue la plantilla como referencia.");
                      return;
                    }
                    setRows(res.data.slice(0, 2000));
                  },
                  error: () => setParseError("No se pudo leer el archivo."),
                });
              }}
            />
          </label>
          {parseError && <Alert tone="error" className="mt-4">{parseError}</Alert>}

          {rows.length > 0 && (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-steel-600"><strong className="text-ink">{rows.length}</strong> filas detectadas. Vista previa:</p>
              <div className="max-h-64 overflow-auto rounded-md border border-steel-150">
                <table className="table-base text-[12.5px]">
                  <thead><tr>{["sku", "name", "category", "brand", "price", "sale_mode", "initial_stock"].map((c) => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>
                    {rows.slice(0, 8).map((r, i) => (
                      <tr key={i}>{["sku", "name", "category", "brand", "price", "sale_mode", "initial_stock"].map((c) => <td key={c} className="max-w-[200px] truncate">{r[c] ?? ""}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Checkbox checked={update} onChange={(e) => setUpdate(e.target.checked)} label="Actualizar productos existentes (mismo SKU)" description="Si no se marca, las filas con SKU existente se omiten. La existencia inicial solo aplica a productos nuevos." />
              <Button
                type="button"
                loading={pending}
                onClick={() => start(async () => {
                  setError(null);
                  const res = await safeCall(() => importProductsAction(rows, update));
                  if (!res.ok) return setError(res.error);
                  setReport(res.data);
                  router.refresh();
                })}
              >
                <Upload className="size-4" /> Importar {rows.length} filas
              </Button>
            </div>
          )}
          {error && <Alert tone="error" className="mt-4">{error}</Alert>}
          {report && (
            <div className="mt-5 space-y-3">
              <Alert tone={report.errors.length ? "warning" : "success"} title="Importación finalizada">
                {report.created} creados · {report.updated} actualizados · {report.skipped} omitidos · {report.errors.length} con errores
              </Alert>
              {report.errors.length > 0 && (
                <div className="max-h-64 overflow-auto rounded-md border border-steel-150">
                  <table className="table-base text-[12.5px]">
                    <thead><tr><th>Línea</th><th>SKU</th><th>Error</th></tr></thead>
                    <tbody>{report.errors.map((e, i) => <tr key={i}><td className="font-mono">{e.line}</td><td className="font-mono">{e.sku}</td><td className="text-err-600">{e.message}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {canExport && (
        <section className="rounded-lg border border-steel-150 bg-white p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold">Exportar inventario</h2>
          <p className="mt-1 text-[13px] text-steel-500">CSV con todos los productos: estado, precios, existencias físicas, reservadas y disponibles, ubicación{" "}y costo (solo si su rol lo permite). Útil para auditorías y respaldos.</p>
          <a href="/api/admin/export" className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-white hover:bg-steel-800"><Download className="size-4" /> Descargar CSV</a>
        </section>
      )}
    </div>
  );
}
