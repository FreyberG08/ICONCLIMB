import type { Permission, Role } from "./types";

// Debe mantenerse sincronizado con la tabla public.role_permissions (migración inicial).
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "catalog.view", "catalog.edit", "catalog.publish", "catalog.cost", "inventory.manage",
    "orders.view", "orders.manage", "quotes.manage", "taxonomy.manage", "data.import",
    "data.export", "users.manage", "audit.view",
  ],
  editor: ["catalog.view", "catalog.edit", "taxonomy.manage", "data.import", "data.export"],
  warehouse: ["catalog.view", "inventory.manage", "orders.view", "data.export"],
  reviewer: [
    "catalog.view", "catalog.edit", "catalog.publish", "catalog.cost", "orders.view",
    "orders.manage", "quotes.manage", "data.export", "audit.view",
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  editor: "Editor de catálogo",
  warehouse: "Almacén",
  reviewer: "Revisor comercial / técnico",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Acceso total: usuarios, catálogo, publicación, inventario, pedidos, cotizaciones y auditoría.",
  editor: "Crea y edita fichas, fotografías, documentos, categorías y marcas. Envía a revisión; no publica.",
  warehouse: "Registra ingresos, salidas y conteos físicos. Consulta pedidos para prepararlos.",
  reviewer: "Revisa y publica productos, verifica compatibilidades, ve costos y gestiona pedidos y cotizaciones.",
};

export function can(role: Role | null | undefined, perm: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(perm);
}
