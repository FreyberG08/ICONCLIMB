"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import type { ProductDocument } from "@/lib/types";
import { deleteDocumentAction, updateDocumentAction } from "@/app/admin/actions";
import { formatBytes } from "@/lib/format";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function DocumentManager({ productId, initial }: { productId: string; initial: ProductDocument[] }) {
  const [docs, setDocs] = useState(initial);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    body.append("title", title || file.name);
    body.append("isPublic", String(isPublic));
    try {
      const res = await fetch(`/api/admin/products/${productId}/documents`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo subir");
      setDocs((d) => [...d, data.document]);
      setTitle("");
      setFile(null);
      setIsPublic(false);
      if (input.current) input.current.value = "";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {docs.length > 0 && (
        <ul className="divide-y divide-steel-100 rounded-lg border border-steel-150">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <FileText className="size-4 shrink-0 text-climb-600" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-ink">{d.title}</span>
                <span className="font-mono text-[11px] text-steel-400">{d.fileName} · {formatBytes(d.sizeBytes)}</span>
              </span>
              <label className="flex items-center gap-1.5 text-[12.5px] text-steel-600">
                <input
                  type="checkbox"
                  className="accent-climb-600"
                  checked={d.isPublic}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setDocs((list) => list.map((x) => (x.id === d.id ? { ...x, isPublic: v } : x)));
                    start(async () => { const r = await updateDocumentAction(d.id, { isPublic: v }); if (!r.ok) setError(r.error); });
                  }}
                />
                Descarga pública autorizada
              </label>
              <a href={`/api/admin/documents/${d.id}`} className="grid size-8 place-items-center rounded text-steel-500 hover:bg-steel-100" aria-label="Descargar"><Download className="size-4" /></a>
              <button
                type="button"
                className="grid size-8 place-items-center rounded text-steel-500 hover:bg-err-50 hover:text-err-600"
                aria-label="Eliminar documento"
                onClick={() => {
                  if (!confirm(`¿Eliminar "${d.title}"?`)) return;
                  setDocs((list) => list.filter((x) => x.id !== d.id));
                  start(async () => { const r = await deleteDocumentAction(d.id); if (!r.ok) setError(r.error); });
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 rounded-lg border border-dashed border-steel-200 bg-steel-25 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block space-y-1.5">
          <span className="text-[13px] font-medium text-steel-700">Archivo (PDF, imagen, DOCX, XLSX, ZIP · máx. 4 MB)</span>
          <input ref={input} type="file" accept=".pdf,.png,.jpg,.jpeg,.zip,.docx,.xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-[13px] file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-[13px] file:font-medium file:ring-1 file:ring-steel-200" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[13px] font-medium text-steel-700">Título visible</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ficha técnica, manual de instalación…" />
        </label>
        <Button type="button" variant="outline" onClick={upload} loading={busy} disabled={!file}><Upload className="size-4" /> Subir</Button>
        <label className="flex items-center gap-2 text-[13px] text-steel-600 sm:col-span-3">
          <input type="checkbox" className="accent-climb-600" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Autorizar descarga pública (solo si el documento puede compartirse con clientes)
        </label>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
