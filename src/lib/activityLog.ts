import { createAdminClient } from '@/lib/supabase/server'

export async function logActivity({
  clientId,
  counselorId,
  actionType,
  description,
  visibility = 'internal',
  metadata = {},
}: {
  clientId: string
  counselorId?: string
  actionType: string
  description: string
  visibility?: 'internal' | 'shared'
  metadata?: Record<string, unknown>
}) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('activity_logs').insert({
    client_id: clientId,
    counselor_id: counselorId || null,
    action_type: actionType,
    description,
    visibility,
    metadata,
  })
  if (error) {
    console.error('[activityLog] insert failed:', error.message, { actionType, clientId })
  }
}

// Human-readable stage labels for the student-facing feed
const STAGE_CLIENT_LABELS: Record<number, string> = {
  1: 'Your case has been registered — initial consultation stage.',
  2: 'Your counselor has requested documents. Please check My Documents.',
  3: 'Your documents have been submitted and are under review.',
  4: 'Your application is now being prepared.',
  5: 'Your application has been submitted to the embassy / institution.',
  6: 'Great news — your application has been approved! 🎉',
  7: 'Your application was not successful this time. Please contact your counselor.',
  8: 'Your case has been closed.',
}

export function stageClientLabel(stage: number): string {
  return STAGE_CLIENT_LABELS[stage] ?? `Your application has moved to stage ${stage}.`
}
