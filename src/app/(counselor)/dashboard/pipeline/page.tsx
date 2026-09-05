import { getAuthenticatedCounselor } from '@/lib/supabase/server'
import { PipelineView } from '@/components/dashboard/PipelineView'
import { getPipelineData, PIPELINE_STAGES } from '@/lib/dashboard/getPipelineData'

export default async function PipelinePage() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return null

  const { clientsByStage, meetingByClient, inactiveClients } = await getPipelineData(counselor.id)

  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="mb-6 text-2xl font-semibold text-white md:text-3xl">Pipeline</h1>

      <PipelineView
        stages={PIPELINE_STAGES}
        clientsByStage={clientsByStage}
        meetingByClient={meetingByClient}
        inactiveClients={inactiveClients}
      />
    </main>
  )
}
