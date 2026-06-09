import { AdminLayoutClient } from '@/components/admin/AdminLayoutClient'
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()

  const supabase = createAdminClient()
  const { count: unassignedCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .is('counselor_id', null)

  return (
    <AdminLayoutClient
      adminId={admin.id}
      adminName={admin.name}
      avatarUrl={admin.avatar_url}
      unassignedCount={unassignedCount ?? 0}
    >
      {children}
    </AdminLayoutClient>
  )
}
