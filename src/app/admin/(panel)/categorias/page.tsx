import { getAdminRepo } from "@/lib/data";
import { PageHeader } from "@/components/admin/page-header";
import { CategoryEditor } from "@/components/admin/taxonomy-editor";

export const metadata = { title: "Categorías" };

export default async function CategoriesPage() {
  const repo = await getAdminRepo("taxonomy.manage");
  const categories = await repo.listAllCategories();
  return (
    <>
      <PageHeader title="Categorías" description="Clasificación flexible del catálogo. Ajústela al inventario real; los cambios se reflejan de inmediato en la tienda." />
      <CategoryEditor categories={categories} />
    </>
  );
}
