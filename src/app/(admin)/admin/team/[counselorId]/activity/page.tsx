import { notFound } from 'next/navigation'
import { ActivityLogView } from '@/components/admin/ActivityLogView'
import { CounselorShiftEditor } from '@/components/admin/CounselorShiftEditor'
import { createAdminClient } from '@/lib/supabase/server'

export default async function CounselorActivityPage({
  params,
}: {
  params: Promise<{ counselorId: string }>
}) {
  const { counselorId } = await params

  const supabase = createAdminClient()
  const { data: counselor } = await supabase
    .from('counselors')
    .select('id, name, role, shift_start_time, shift_end_time, working_days')
    .eq('id', counselorId)
    .maybeSingle()

  if (!counselor) notFound()

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6">
      {counselor.role === 'counselor' && (
        <CounselorShiftEditor
          counselorId={counselor.id}
          initialShiftStart={counselor.shift_start_time || '09:00:00'}
          initialShiftEnd={counselor.shift_end_time || '17:00:00'}
          initialWorkingDays={counselor.working_days ?? [1, 2, 3, 4, 5, 6]}
        />
      )}
      <ActivityLogView counselorId={counselor.id} counselorName={counselor.name} />
    </main>
  )
}
