import { getAdminRepo } from "@/lib/data";
import { isDemoMode } from "@/lib/config";
import { PageHeader } from "@/components/admin/page-header";
import { UsersPanel } from "@/components/admin/users-panel";

export const metadata = { title: "Usuarios y permisos" };

export default async function UsersPage() {
  const repo = await getAdminRepo("users.manage");
  const users = await repo.listUsers();
  return (
    <>
      <PageHeader title="Usuarios y permisos" description="Las cuentas nuevas quedan inactivas hasta que un administrador les asigna un rol. Los permisos se aplican también en la base de datos (RLS)." />
      <UsersPanel users={users} currentId={repo.user.id} demo={isDemoMode} canInvite={!!process.env.SUPABASE_SERVICE_ROLE_KEY} />
    </>
  );
}
