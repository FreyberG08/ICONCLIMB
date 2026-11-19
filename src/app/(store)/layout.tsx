import { getPublicRepo } from "@/lib/data";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { DemoBanner } from "@/components/store/demo-banner";
import { WhatsAppFloat } from "@/components/store/whatsapp-button";
import { StoreProvider } from "@/components/store/store-state";
import { StoreToast } from "@/components/store/toast";
import { MotionProvider } from "@/components/motion/motion-provider";
import { CursorFollower } from "@/components/motion/cursor";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const categories = await getPublicRepo().listCategories().catch(() => []);
  const top = categories.filter((c) => !c.parentId);
  return (
    <StoreProvider>
      <MotionProvider>
      <a href="#contenido" className="sr-only z-50 rounded bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Saltar al contenido
      </a>
      <DemoBanner />
      <Header categories={top.map((c) => ({ name: c.name, slug: c.slug, productCount: c.productCount }))} />
      <main id="contenido">{children}</main>
      <Footer categories={top} />
      <WhatsAppFloat />
      <StoreToast />
      <CursorFollower />
      </MotionProvider>
    </StoreProvider>
  );
}
