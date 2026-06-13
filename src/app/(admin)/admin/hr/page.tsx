import { HrSection } from '@/components/admin/HrSection'
import { createAdminClient } from '@/lib/supabase/server'

export default async function HrPage() {
  const supabase = createAdminClient()

  const { data: counselors } = await supabase
    .from('counselors')
    .select('id, name')
    .eq('role', 'counselor')
    .order('name')

  return (
    <main className="flex-1 p-4 md:p-8">
      <HrSection counselors={counselors ?? []} />
    </main>
  )
}
