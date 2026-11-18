import "server-only";
import { isDemoMode } from "../config";
import { requireStaff } from "../auth/session";
import type { Permission } from "../types";
import type { AdminRepository, PublicRepository } from "./repository";
import { demoPublicRepo, createDemoAdminRepo } from "./demo/repo";
import { createSupabaseAdminRepo, createSupabasePublicRepo } from "./supabase/repo";
import { supabaseServer } from "../supabase/server";

export { DomainError } from "./repository";

let publicRepo: PublicRepository | null = null;

/** Repositorio del catálogo público: nunca accede a datos internos. */
export function getPublicRepo(): PublicRepository {
  if (!publicRepo) publicRepo = isDemoMode ? demoPublicRepo : createSupabasePublicRepo();
  return publicRepo;
}

/** Repositorio administrativo ligado al usuario autenticado. Redirige si no hay sesión válida. */
export async function getAdminRepo(perm?: Permission): Promise<AdminRepository> {
  const user = await requireStaff(perm);
  if (isDemoMode) return createDemoAdminRepo(user);
  return createSupabaseAdminRepo(await supabaseServer(), user);
}
