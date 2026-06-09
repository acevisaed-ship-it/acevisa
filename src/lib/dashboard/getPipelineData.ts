import { createAdminClient } from '@/lib/supabase/server'
import type { Client } from '@/types'

export const PIPELINE_STAGES: { stage: number; label: string }[] = [
  { stage: 1, label: 'New Lead' },
  { stage: 2, label: 'Qualified' },
  { stage: 3, label: 'Registered Client' },
  { stage: 4, label: 'Documents In Progress' },
  { stage: 5, label: 'Application Submitted' },
  { stage: 6, label: 'Visa Outcome' },
  { stage: 7, label: 'Alumni' },
]

export type PipelineData = {
  clientsByStage: Record<number, Client[]>
  meetingByClient: Record<string, string>
}

export async function getPipelineData(counselorId: string): Promise<PipelineData> {
  const supabase = createAdminClient()

  const [{ data: clients }, { data: meetings }] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('counselor_id', counselorId)
      .order('registration_date', { ascending: false }),
    supabase
      .from('meetings')
      .select('id, client_id')
      .eq('counselor_id', counselorId)
      .order('created_at', { ascending: false }),
  ])

  const meetingByClient: Record<string, string> = {}
  for (const meeting of meetings ?? []) {
    if (!meetingByClient[meeting.client_id]) {
      meetingByClient[meeting.client_id] = meeting.id
    }
  }

  const clientsByStage: Record<number, Client[]> = {}
  for (const stage of PIPELINE_STAGES) {
    clientsByStage[stage.stage] = []
  }
  for (const client of (clients ?? []) as Client[]) {
    const stage = client.pipeline_stage ?? 1
    clientsByStage[stage] = [...(clientsByStage[stage] ?? []), client]
  }

  return { clientsByStage, meetingByClient }
}
