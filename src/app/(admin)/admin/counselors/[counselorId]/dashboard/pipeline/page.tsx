import { notFound } from 'next/navigation'
import { PipelineView } from '@/components/dashboard/PipelineView'
import { getPipelineData, PIPELINE_STAGES } from '@/lib/dashboard/getPipelineData'
import { createAdminClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ counselorId: string }>
}

export default async function AdminCounselorPipelinePage({ params }: Props) {
  const { counselorId } = await params
  const supabase = createAdminClient()

  const [{ data: counselor }, pipelineData, { data: counselors }] = await Promise.all([
    supabase
      .from('counselors')
      .select('id, role, status')
      .eq('id', counselorId)
      .single(),
    getPipelineData(counselorId),
    supabase
      .from('counselors')
      .select('id, name')
      .eq('role', 'counselor')
      .eq('status', 'active')
      .order('name'),
  ])

  if (!counselor || counselor.role !== 'counselor' || counselor.status !== 'active') {
    notFound()
  }

  const basePath = `/admin/counselors/${counselorId}/dashboard`

  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="mb-6 text-2xl font-semibold text-white md:text-3xl">Pipeline</h1>

      <PipelineView
        stages={PIPELINE_STAGES}
        clientsByStage={pipelineData.clientsByStage}
        meetingByClient={pipelineData.meetingByClient}
        inactiveClients={pipelineData.inactiveClients}
        basePath={basePath}
        allowTransfer
        viewingCounselorId={counselorId}
        counselors={(counselors ?? []).map((c) => ({ id: c.id, name: c.name }))}
      />
    </main>
  )
}
