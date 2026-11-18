import type { MetadataRoute } from "next";
import { getPublicRepo } from "@/lib/data";
import { site } from "@/lib/config";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = getPublicRepo();
  const [products, categories] = await Promise.all([repo.listPublishedForSitemap().catch(() => []), repo.listCategories().catch(() => [])]);
  return [
    { url: `${site.url}/`, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/catalogo`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/cotizacion`, changeFrequency: "monthly", priority: 0.6 },
    ...categories.map((c) => ({ url: `${site.url}/catalogo?categoria=${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${site.url}/producto/${p.slug}`, lastModified: p.updatedAt ?? undefined, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
