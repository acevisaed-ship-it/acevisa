import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { PipelineView } from '@/components/dashboard/PipelineView'
import type { Client } from '@/types'

const STAGES: { stage: number; label: string }[] = [
  { stage: 1, label: 'New Lead' },
  { stage: 2, label: 'Qualified' },
  { stage: 3, label: 'Registered Client' },
  { stage: 4, label: 'Documents In Progress' },
  { stage: 5, label: 'Application Submitted' },
  { stage: 6, label: 'Visa Outcome' },
  { stage: 7, label: 'Alumni' },
]

export default async function PipelinePage() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return null

  const supabase = createAdminClient()

  const [{ data: clients }, { data: meetings }] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('counselor_id', counselor.id)
      .order('registration_date', { ascending: false }),
    supabase
      .from('meetings')
      .select('id, client_id')
      .eq('counselor_id', counselor.id)
      .order('created_at', { ascending: false }),
  ])

  const meetingByClient: Record<string, string> = {}
  for (const meeting of meetings ?? []) {
    if (!meetingByClient[meeting.client_id]) {
      meetingByClient[meeting.client_id] = meeting.id
    }
  }

  const clientsByStage: Record<number, Client[]> = {}
  for (const stage of STAGES) {
    clientsByStage[stage.stage] = []
  }
  for (const client of (clients ?? []) as Client[]) {
    const stage = client.pipeline_stage ?? 1
    clientsByStage[stage] = [...(clientsByStage[stage] ?? []), client]
  }

  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="mb-6 text-2xl font-semibold text-blue md:text-3xl">Pipeline</h1>

      <PipelineView
        stages={STAGES}
        clientsByStage={clientsByStage}
        meetingByClient={meetingByClient}
      />
    </main>
  )
}
