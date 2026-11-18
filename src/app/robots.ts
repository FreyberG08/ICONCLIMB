import type { MetadataRoute } from "next";
import { isDemoMode, site } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: isDemoMode
      ? { userAgent: "*", disallow: "/" }
      : { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/carrito", "/cotizacion/enviada", "/pedido"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
