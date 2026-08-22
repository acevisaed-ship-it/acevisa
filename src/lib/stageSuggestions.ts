import { createAdminClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

/**
 * Record an AI-proposed pipeline_stage change for counselor review — this is
 * the ONLY thing AI-driven stage detection should do. Nothing here writes to
 * clients.pipeline_stage; that only happens once a counselor approves the
 * suggestion via PATCH /api/stage-suggestions/[id].
 */
export async function suggestStageChange({
  clientId,
  counselorId,
  currentStage,
  suggestedStage,
  reason,
}: {
  clientId: string
  counselorId?: string | null
  currentStage: number
  suggestedStage: number
  reason: string
}) {
  if (suggestedStage === currentStage) return

  const supabase = createAdminClient()

  // Avoid piling up duplicate pending suggestions for the same target stage.
  const { data: existing } = await supabase
    .from('stage_suggestions')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .eq('suggested_stage', suggestedStage)
    .maybeSingle()

  if (existing) return

  await supabase.from('stage_suggestions').insert({
    client_id: clientId,
    current_stage: currentStage,
    suggested_stage: suggestedStage,
    reason,
  })

  if (counselorId) {
    await createNotification({
      counselorId,
      type: 'stage_suggestion',
      title: 'AI suggests a stage change — confirm?',
      body: reason,
      clientId,
    })
  }
}
