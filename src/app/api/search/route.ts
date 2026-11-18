import { NextResponse } from "next/server";
import { getPublicRepo } from "@/lib/data";

// Sugerencias del buscador (solo productos publicados).
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 80) ?? "";
  if (q.trim().length < 2) return NextResponse.json({ items: [] });
  try {
    const res = await getPublicRepo().searchCatalog({ q, pageSize: 6 });
    return NextResponse.json(
      { items: res.items.map((p) => ({ slug: p.slug, name: p.name, sku: p.sku, brandName: p.brandName, reference: p.reference })) },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
    );
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
