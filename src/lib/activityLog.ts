import { createAdminClient } from '@/lib/supabase/server'
import { closeMilestoneTasksForStage } from '@/lib/tasks/closeMilestoneTasks'

export async function logActivity({
  clientId,
  counselorId,
  actorRole,
  actionType,
  description,
  visibility = 'internal',
  metadata = {},
}: {
  clientId?: string | null
  counselorId?: string
  actorRole?: string
  actionType: string
  description: string
  visibility?: 'internal' | 'shared'
  metadata?: Record<string, unknown>
}): Promise<{ error: string | null }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('activity_logs').insert({
    client_id: clientId || null,
    counselor_id: counselorId || null,
    actor_role: actorRole || null,
    action_type: actionType,
    description,
    visibility,
    metadata,
  })
  if (error) {
    console.error('[activityLog] insert failed:', error.message, { actionType, clientId })
    return { error: error.message }
  }

  // Idle-clock reset: this is the ONE funnel every counselor-authored,
  // client-linked action already passes through, so it's the single place
  // to bump last_counselor_activity_at rather than touching ~40 call
  // sites individually. Only counts when the actor IS that client's own
  // assigned counselor — per the CEO's spec, another counselor, an admin,
  // a receptionist, or an automated/system/AI action must NOT reset the
  // clock, only the assigned counselor's own casework does.
  //
  // actorRole is optional at many call sites (stage changes, document
  // requests). Treat a missing role as human-authored; only an explicit
  // 'system' role is excluded. resetIdleClock still requires the actor
  // to be the assigned counselor.
  if (clientId && counselorId && actorRole !== 'system') {
    await resetIdleClock(supabase, clientId, counselorId)
  }

  if (clientId && actionType === 'stage_change') {
    const newStage = Number(metadata.pipeline_stage)
    const previousStage =
      metadata.previousStage != null ? Number(metadata.previousStage) : undefined
    if (Number.isFinite(newStage)) {
      await closeMilestoneTasksForStage(supabase, clientId, newStage, previousStage)
    }
  }

  return { error: null }
}

async function resetIdleClock(
  supabase: ReturnType<typeof createAdminClient>,
  clientId: string,
  counselorId: string
) {
  const { data: client } = await supabase
    .from('clients')
    .select('counselor_id')
    .eq('id', clientId)
    .maybeSingle()

  if (!client || client.counselor_id !== counselorId) return

  await supabase
    .from('clients')
    .update({ last_counselor_activity_at: new Date().toISOString() })
    .eq('id', clientId)

  // The counselor just acted on this case — any idle-follow-up task
  // waiting on exactly that action auto-closes instead of sitting open
  // until the next negligence sweep flags it.
  const { data: idleTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('client_id', clientId)
    .eq('source', 'idle_followup')
    .in('status', ['open', 'in_progress'])

  if (idleTasks && idleTasks.length > 0) {
    await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .in('id', idleTasks.map((t) => t.id))
  }
}

// Convenience wrapper for staff-only events with no associated client
// (account creation, settings changes). Same activity_logs table as
// client-linked actions; shown on /admin/activity (Staff Log and Activity).
export async function logStaffActivity({
  counselorId,
  actorRole,
  actionType,
  description,
  metadata = {},
}: {
  counselorId: string
  actorRole: string
  actionType: string
  description: string
  metadata?: Record<string, unknown>
}) {
  return logActivity({
    clientId: null,
    counselorId,
    actorRole,
    actionType,
    description,
    visibility: 'internal',
    metadata,
  })
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
