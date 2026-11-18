import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoMode } from "../config";
import { can } from "../permissions";
import type { Permission, StaffUser } from "../types";
import { DEMO_COOKIE, verifyDemoToken } from "./demo-session";
import { db } from "../data/demo/store";
import { supabaseServer } from "../supabase/server";

export type SessionState =
  | { status: "anonymous" }
  | { status: "inactive"; email: string }
  | { status: "active"; user: StaffUser };

/** Usuario interno actual (una vez por petición). */
export const getSession = cache(async (): Promise<SessionState> => {
  if (isDemoMode) {
    const jar = await cookies();
    const userId = verifyDemoToken(jar.get(DEMO_COOKIE)?.value);
    if (!userId) return { status: "anonymous" };
    const u = db().users.find((x) => x.id === userId);
    if (!u) return { status: "anonymous" };
    if (!u.active) return { status: "inactive", email: u.email };
    return { status: "active", user: { id: u.id, email: u.email, fullName: u.fullName, role: u.role, active: u.active } };
  }
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return { status: "anonymous" };
  const { data: profile } = await sb.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  if (!profile || !profile.active) return { status: "inactive", email: data.user.email ?? "" };
  return {
    status: "active",
    user: { id: profile.id, email: profile.email, fullName: profile.full_name ?? "", role: profile.role, active: profile.active },
  };
});

/** Exige un usuario interno activo (y opcionalmente un permiso) o redirige. */
export async function requireStaff(perm?: Permission): Promise<StaffUser> {
  const s = await getSession();
  if (s.status === "anonymous") redirect("/admin/login");
  if (s.status === "inactive") redirect("/admin/login?inactive=1");
  if (perm && !can(s.user.role, perm)) redirect("/admin?denied=1");
  return s.user;
}
