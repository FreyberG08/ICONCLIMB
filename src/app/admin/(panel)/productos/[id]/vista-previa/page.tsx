import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { getAdminRepo } from "@/lib/data";
import { adminToPreview } from "@/lib/data/shared";
import { PRODUCT_STATUS } from "@/lib/labels";
import { ProductDetailView } from "@/components/store/product-detail";
import { StoreProvider } from "@/components/store/store-state";

export const metadata = { title: "Vista previa" };

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getAdminRepo("catalog.view");
  const product = await repo.getProduct(id);
  if (!product) notFound();
  const [categories, brands] = await Promise.all([repo.listAllCategories(), repo.listAllBrands()]);
  const cat = categories.find((c) => c.id === product.categoryId);
  const preview = adminToPreview(product, { category: cat?.name ?? null, categorySlug: cat?.slug ?? null, brand: brands.find((b) => b.id === product.brandId)?.name ?? null });
  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-10 lg:-my-10">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-climb-200 bg-climb-50 px-6 py-3 text-[13px] text-climb-800">
        <span className="flex items-center gap-2"><Eye className="size-4" /> Vista previa · Estado: <strong>{PRODUCT_STATUS[product.status].label}</strong> · Solo se muestran compatibilidades verificadas y documentos públicos.</span>
        <Link href={`/admin/productos/${id}`} className="font-medium underline">Volver a editar</Link>
      </div>
      <div className="bg-white">
        <StoreProvider>
          <ProductDetailView product={preview} preview />
        </StoreProvider>
      </div>
    </div>
  );
}
