import { requireAdmin } from '@/lib/supabase/server'
import { AdminSettings } from '@/components/admin/AdminSettings'

export default async function AdminSettingsPage() {
  const admin = await requireAdmin()
  return (
    <main className="flex-1 p-4 md:p-8">
      <AdminSettings adminRole={admin.role} />
    </main>
  )
}
