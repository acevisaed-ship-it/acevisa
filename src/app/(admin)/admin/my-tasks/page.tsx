import { AdminMyTasksClient } from '@/components/admin/AdminMyTasksClient'
import { requireAdmin } from '@/lib/supabase/server'

export default async function AdminMyTasksPage() {
  const admin = await requireAdmin()

  return (
    <main className="flex-1 p-4 md:p-8">
      <AdminMyTasksClient adminId={admin.id} adminName={admin.name} />
    </main>
  )
}
