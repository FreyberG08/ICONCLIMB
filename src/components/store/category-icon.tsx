import { Boxes, CircuitBoard, Cog, DoorOpen, Droplets, Grid3x3, PackageSearch, ShieldCheck, Wrench, Zap, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "tarjetas-y-electronica": CircuitBoard,
  "variadores-y-componentes-electricos": Zap,
  "botoneras-y-displays": Grid3x3,
  "puertas-y-operadores": DoorOpen,
  "sensores-y-seguridad": ShieldCheck,
  "motores-y-frenos": Cog,
  "componentes-mecanicos": Wrench,
  "accesorios-y-consumibles": Droplets,
  "repuestos-especiales": PackageSearch,
};

export function CategoryIcon({ slug, className }: { slug: string | null | undefined; className?: string }) {
  const Icon = (slug && ICONS[slug]) || Boxes;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.6} />;
}
