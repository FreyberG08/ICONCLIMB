import { notFound } from "next/navigation";
import { getAdminRepo } from "@/lib/data";
import { can } from "@/lib/permissions";
import { site } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { publishChecklist } from "@/lib/data/shared";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { Alert } from "@/components/ui/misc";

export const metadata = { title: "Editar producto" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const repo = await getAdminRepo("catalog.view");
  const [product, categories, brands] = await Promise.all([repo.getProduct(id), repo.listAllCategories(), repo.listAllBrands()]);
  if (!product) notFound();
  const r = repo.user.role;
  return (
    <>
      <PageHeader
        title={product.name}
        description={<><span className="sku">{product.sku}</span> · Creado {formatDate(product.createdAt)} · Actualizado {formatDate(product.updatedAt, true)}{product.publishedAt && <> · Publicado {formatDate(product.publishedAt)}</>}</>}
        back={{ href: "/admin/productos", label: "Productos" }}
      />
      {sp.creado && <Alert tone="success" className="mb-6" title="Producto creado como borrador">Complete la ficha y envíelo a revisión cuando esté listo.</Alert>}
      {sp.fotos === "error" && <Alert tone="warning" className="mb-6">Algunas fotografías no se pudieron subir. Inténtelo nuevamente desde la sección Fotografías.</Alert>}
      {sp.duplicado && <Alert tone="info" className="mb-6">Copia creada como borrador, sin fotografías ni existencias. Revise el SKU y el nombre.</Alert>}
      <ProductForm
        key={product.updatedAt}
        product={product}
        categories={categories}
        brands={brands.filter((b) => b.active || b.id === product.brandId)}
        defaultCurrency={site.defaultCurrency}
        checklist={publishChecklist(product)}
        perms={{ canEdit: can(r, "catalog.edit"), canPublish: can(r, "catalog.publish"), canCost: can(r, "catalog.cost"), canInventory: can(r, "inventory.manage") }}
      />
    </>
  );
}
