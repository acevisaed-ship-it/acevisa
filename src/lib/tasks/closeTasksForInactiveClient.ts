import type { SupabaseClient } from '@supabase/supabase-js'
import { logActivity } from '@/lib/activityLog'

/**
 * When a client is marked inactive (pipeline_active -> false), their open/
 * in-progress tasks would otherwise sit there forever — never worked (the
 * client isn't being actively cased), but still eligible to be picked up as
 * overdue and eventually negligence-flagged by the nightly cron. Close them
 * out immediately instead, the same way a milestone task auto-closes when a
 * case advances past it (see closeMilestoneTasks.ts).
 *
 * Not called on reactivation — an inactive client coming back should get
 * fresh follow-ups from their counselor, not a pile of stale auto-reopened
 * ones.
 */
export async function closeOpenTasksForInactiveClient(
  supabase: SupabaseClient,
  clientId: string,
  closedBy: string
): Promise<{ closed: number }> {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id')
    .eq('client_id', clientId)
    .in('status', ['open', 'in_progress'])

  if (error) {
    console.error('[closeTasksForInactiveClient] fetch failed:', error.message)
    return { closed: 0 }
  }
  if (!tasks || tasks.length === 0) return { closed: 0 }

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ status: 'closed', closed_at: now, closed_by: closedBy })
    .in(
      'id',
      tasks.map((t) => t.id)
    )

  if (updateError) {
    console.error('[closeTasksForInactiveClient] update failed:', updateError.message)
    return { closed: 0 }
  }

  await logActivity({
    clientId,
    counselorId: closedBy,
    actorRole: 'system',
    actionType: 'tasks_closed_inactive',
    description: `${tasks.length} open task${tasks.length === 1 ? '' : 's'} auto-closed because this client was marked inactive`,
    metadata: { taskIds: tasks.map((t) => t.id) },
  })

  return { closed: tasks.length }
}
