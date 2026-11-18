import { redirect } from "next/navigation";
import { getAdminRepo } from "@/lib/data";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/page-header";
import { ImportPanel } from "@/components/admin/import-panel";

export const metadata = { title: "Importar / exportar" };

export default async function DataPage() {
  const repo = await getAdminRepo("catalog.view");
  const r = repo.user.role;
  if (!can(r, "data.import") && !can(r, "data.export")) redirect("/admin?denied=1");
  return (
    <>
      <PageHeader title="Importar y exportar" description="Cargue el catálogo progresivamente desde hojas de cálculo y exporte el inventario para auditorías." />
      <ImportPanel canImport={can(r, "data.import")} canExport={can(r, "data.export")} />
    </>
  );
}
