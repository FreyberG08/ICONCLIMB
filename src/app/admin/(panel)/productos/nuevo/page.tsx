import { getAdminRepo } from "@/lib/data";
import { can } from "@/lib/permissions";
import { site } from "@/lib/config";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const repo = await getAdminRepo("catalog.edit");
  const [categories, brands] = await Promise.all([repo.listAllCategories(), repo.listAllBrands()]);
  const r = repo.user.role;
  return (
    <>
      <PageHeader
        title="Nuevo producto"
        description="Se guardará como borrador. Complete la ficha, cargue fotografías y envíelo a revisión para su publicación."
        back={{ href: "/admin/productos", label: "Productos" }}
      />
      <ProductForm
        product={null}
        categories={categories}
        brands={brands.filter((b) => b.active)}
        defaultCurrency={site.defaultCurrency}
        perms={{ canEdit: true, canPublish: can(r, "catalog.publish"), canCost: can(r, "catalog.cost"), canInventory: can(r, "inventory.manage") }}
      />
    </>
  );
}
