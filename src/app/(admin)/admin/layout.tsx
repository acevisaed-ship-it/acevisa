import { AdminLayoutClient } from '@/components/admin/AdminLayoutClient'
import { createAdminClient, requireAdmin, isBranchScoped } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()

  const supabase = createAdminClient()
  let unassignedQuery = supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .is('counselor_id', null)
  if (isBranchScoped(admin)) {
    unassignedQuery = unassignedQuery.eq('branch_id', admin.branch_id)
  }
  const { count: unassignedCount } = await unassignedQuery

  return (
    <AdminLayoutClient
      adminId={admin.id}
      adminName={admin.name}
      adminRole={admin.role}
      avatarUrl={admin.avatar_url}
      unassignedCount={unassignedCount ?? 0}
    >
      {children}
    </AdminLayoutClient>
  )
}
