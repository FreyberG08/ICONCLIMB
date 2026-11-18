import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicRepo } from "@/lib/data";
import { site } from "@/lib/config";
import { ProductDetailView } from "@/components/store/product-detail";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicRepo().getProductBySlug(slug);
  if (!p) return { title: "Producto no encontrado", robots: { index: false } };
  const description = p.shortDescription ?? `${p.name} · SKU ${p.sku}${p.brandName ? ` · ${p.brandName}` : ""}. Repuesto para ascensores.`;
  return {
    title: `${p.name} (${p.sku})`,
    description,
    alternates: { canonical: `/producto/${p.slug}` },
    openGraph: { title: p.name, description, images: p.images[0] ? [{ url: p.images[0].url }] : undefined, type: "website" },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getPublicRepo().getProductBySlug(slug);
  if (!product) notFound();

  const availabilityUrl = {
    in_stock: "https://schema.org/InStock",
    low_stock: "https://schema.org/LimitedAvailability",
    out_of_stock: product.saleMode === "quote" ? "https://schema.org/PreOrder" : "https://schema.org/OutOfStock",
  }[product.availability];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    mpn: product.reference ?? undefined,
    description: product.shortDescription ?? undefined,
    image: product.images.map((i) => i.url),
    brand: product.brandName ? { "@type": "Brand", name: product.brandName } : undefined,
    category: product.categoryName ?? undefined,
    offers:
      product.saleMode === "direct" && product.price != null
        ? { "@type": "Offer", price: product.price.toFixed(2), priceCurrency: product.currency, availability: availabilityUrl, url: `${site.url}/producto/${product.slug}`, seller: { "@type": "Organization", name: site.legalName } }
        : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ProductDetailView product={product} />
    </>
  );
}
