import { notFound } from 'next/navigation'
import { ActivityLogView } from '@/components/admin/ActivityLogView'
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
    .select('id, name')
    .eq('id', counselorId)
    .maybeSingle()

  if (!counselor) notFound()

  return (
    <main className="flex-1 p-4 md:p-8">
      <ActivityLogView counselorId={counselor.id} counselorName={counselor.name} />
    </main>
  )
}
