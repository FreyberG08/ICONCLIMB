import { getAdminRepo } from "@/lib/data";
import { PageHeader } from "@/components/admin/page-header";
import { BrandEditor } from "@/components/admin/taxonomy-editor";

export const metadata = { title: "Marcas" };

export default async function BrandsPage() {
  const repo = await getAdminRepo("taxonomy.manage");
  const brands = await repo.listAllBrands();
  return (
    <>
      <PageHeader title="Marcas y fabricantes" description="Se usan como filtro en el catálogo y en la búsqueda. Desactive una marca para ocultarla sin perder el historial." />
      <BrandEditor brands={brands} />
    </>
  );
}
