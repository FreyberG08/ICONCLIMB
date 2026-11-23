// Configuración central. Las variables NEXT_PUBLIC_* son visibles en el navegador;
// las demás solo existen en el servidor.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Modo demostración: activo cuando no hay credenciales de Supabase o se fuerza con ICON_DEMO_MODE=true. */
export const isDemoMode = process.env.ICON_DEMO_MODE === "true" || !supabaseUrl || !supabaseAnonKey;

export const supabaseConfig = { url: supabaseUrl, anonKey: supabaseAnonKey };

export const site = {
  name: "AICON",
  /** Razón social que aparece en el pie y en la política de privacidad. */
  legalName: process.env.NEXT_PUBLIC_COMPANY_NAME || "AICON",
  tagline: "La pieza correcta. En el momento indicado.",
  description:
    "Repuestos, componentes electrónicos, piezas mecánicas y accesorios para ascensores. Compra directa o solicitud de cotización con respaldo técnico especializado.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  defaultCurrency: (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "USD").toUpperCase(),
  locale: process.env.NEXT_PUBLIC_LOCALE || "es",
  /** Número de WhatsApp en formato internacional sin "+" (p. ej. 584121234567). Opcional. */
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, ""),
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
  address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS || "",
  hours: process.env.NEXT_PUBLIC_BUSINESS_HOURS || "",
  logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
  heroImageUrl: process.env.NEXT_PUBLIC_HERO_IMAGE_URL || "",
};

export const CURRENCIES = ["USD", "EUR", "VES", "COP", "MXN", "PEN", "CLP"] as const;

export function whatsappLink(message?: string) {
  if (!site.whatsapp) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${site.whatsapp}${text}`;
}
