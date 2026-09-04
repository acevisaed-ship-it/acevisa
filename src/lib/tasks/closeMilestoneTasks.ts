import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Close open milestone tasks once the client's pipeline has advanced past
 * the stage they were created against. Tasks without a stored
 * milestone_stage are left alone — those need a counselor to complete them
 * by hand (same as before this hook existed).
 */
export async function closeMilestoneTasksForStage(
  supabase: SupabaseClient,
  clientId: string,
  newStage: number,
  previousStage?: number | null
) {
  if (previousStage != null && newStage <= previousStage) return

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, milestone_stage')
    .eq('client_id', clientId)
    .eq('is_milestone', true)
    .in('status', ['open', 'in_progress'])
    .not('milestone_stage', 'is', null)

  if (error) {
    console.error('[closeMilestoneTasks] fetch failed:', error.message)
    return
  }

  const toClose = (tasks ?? []).filter(
    (t) => typeof t.milestone_stage === 'number' && t.milestone_stage < newStage
  )
  if (toClose.length === 0) return

  const { error: updateError } = await supabase
    .from('tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .in(
      'id',
      toClose.map((t) => t.id)
    )

  if (updateError) {
    console.error('[closeMilestoneTasks] update failed:', updateError.message)
  }
}
