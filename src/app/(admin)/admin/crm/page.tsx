import { CrmKanban } from '@/components/admin/CrmKanban'
import { createAdminClient } from '@/lib/supabase/server'

export default async function CrmPage() {
  const supabase = createAdminClient()

  const [{ data: counselors }, { data: clients }] = await Promise.all([
    supabase
      .from('counselors')
      .select('id, name')
      .eq('role', 'counselor')
      .eq('status', 'active')
      .order('name'),
    supabase.from('clients').select('id, name').neq('status', 'removed').order('name'),
  ])

  return (
    <main className="flex-1 p-4 md:p-8">
      <CrmKanban counselors={counselors ?? []} clients={clients ?? []} />
    </main>
  )
}
