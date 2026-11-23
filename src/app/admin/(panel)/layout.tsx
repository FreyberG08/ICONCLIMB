import type { Metadata } from "next";
import { getAdminRepo } from "@/lib/data";
import { can } from "@/lib/permissions";
import { Sidebar } from "@/components/admin/sidebar";
import { DemoBanner } from "@/components/store/demo-banner";

export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel AICON" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const repo = await getAdminRepo();
  const u = repo.user;
  const [quotes, orders, review] = await Promise.all([
    can(u.role, "quotes.manage") ? repo.listQuotes({ status: "new" }).then((l) => l.length).catch(() => 0) : 0,
    can(u.role, "orders.view") ? repo.listOrders({ status: "received" }).then((l) => l.length).catch(() => 0) : 0,
    can(u.role, "catalog.publish") ? repo.listProducts({ status: "pending_review", pageSize: 1 }).then((r) => r.total).catch(() => 0) : 0,
  ]);
  return (
    <div className="min-h-dvh bg-steel-50">
      <Sidebar user={u} counts={{ quotes, orders, review }} />
      <div className="lg:pl-64">
        <DemoBanner admin />
        <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
