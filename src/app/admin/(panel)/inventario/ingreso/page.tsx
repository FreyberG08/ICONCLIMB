import { redirect } from "next/navigation";
import { getAdminRepo } from "@/lib/data";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/page-header";
import { IntakeForm } from "@/components/admin/intake-form";

export const metadata = { title: "Registrar ingreso" };

export default async function IntakePage() {
  const repo = await getAdminRepo("catalog.view");
  const r = repo.user.role;
  if (!can(r, "inventory.manage") && !can(r, "catalog.edit")) redirect("/admin?denied=1");
  const categories = await repo.listAllCategories();
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Registrar ingreso de repuesto"
        description="Pasos 1 a 4 del flujo: llegada al almacén, cantidad, SKU y borrador. Luego se completan fotografías y ficha técnica."
        back={{ href: "/admin/inventario", label: "Inventario" }}
      />
      <IntakeForm categories={categories} canStock={can(r, "inventory.manage")} />
    </div>
  );
}
