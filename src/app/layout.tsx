import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { site } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Repuestos para ascensores | ${site.legalName}`,
    template: `%s | ${site.name} · ${site.legalName}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    locale: "es",
    siteName: `${site.name} · ${site.legalName}`,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Activa la experiencia animada antes del primer pintado (sin parpadeos).
            Si el motor no arranca en 4 s, el contenido se muestra igual. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;if(location.pathname.indexOf('/admin')===0||matchMedia('(prefers-reduced-motion: reduce)').matches)return;d.classList.add('motion');try{if(!sessionStorage.getItem('icon.intro'))d.classList.add('intro')}catch(e){}setTimeout(function(){if(!d.dataset.motionInit){d.classList.remove('motion','intro')}},4000)}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
