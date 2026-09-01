import { HrSection } from '@/components/admin/HrSection'
import { createAdminClient } from '@/lib/supabase/server'

export default async function HrPage() {
  const supabase = createAdminClient()

  // Staff list for the Attendance/Leave/Analytics tabs. CEO is intentionally
  // excluded — attendance tracking doesn't apply to that account. (A few
  // stray August attendance_records rows exist for the CEO id; see B3 notes
  // — harmless since this exclusion already keeps them out of every HR view.)
  const { data: counselors } = await supabase
    .from('counselors')
    .select('id, name')
    .in('role', ['counselor', 'admin'])
    .eq('status', 'active')
    .order('name')

  return (
    <main className="flex-1 p-4 md:p-8">
      <HrSection counselors={counselors ?? []} />
    </main>
  )
}
