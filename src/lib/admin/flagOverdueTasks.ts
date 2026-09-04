import type { SupabaseClient } from '@supabase/supabase-js'
import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { getTodayPKTDateString, getPKTDayBounds, formatPKTDate } from '@/lib/pkt'

// Shared by the nightly cron (/api/cron/flag-overdue-tasks) and the manual
// "Flag now" button on the HR Flags panel — same logic either way, so a CEO
// isn't stuck waiting on the next scheduled run (or wondering whether Vercel
// Cron actually fired) to see today's overdue tasks reflected as flags.
export async function flagOverdueTasks(supabase: SupabaseClient) {
  const todayPKT = getTodayPKTDateString()
  const { startUTC } = getPKTDayBounds(todayPKT)

  const { data: overdueTasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id, task_text, due_date, counselor_id, client_id, clients(name)')
    .in('status', ['open', 'in_progress'])
    .eq('negligence_flagged', false)
    .not('due_date', 'is', null)
    .lt('due_date', startUTC)

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  if (!overdueTasks || overdueTasks.length === 0) {
    return { flagged: 0 }
  }

  const ids = overdueTasks.map((t) => t.id)
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ negligence_flagged: true })
    .in('id', ids)

  if (updateError) {
    throw new Error(updateError.message)
  }

  for (const task of overdueTasks) {
    const client = task.clients as unknown as { name: string } | null
    const clientLabel = client?.name ? ` for ${client.name}` : ''
    const dueLabel = task.due_date ? formatPKTDate(task.due_date) : 'earlier'

    await logActivity({
      clientId: task.client_id,
      counselorId: task.counselor_id,
      actorRole: 'system',
      actionType: 'task_overdue',
      description: `Task overdue${clientLabel}: "${task.task_text}" (was due ${dueLabel})`,
      metadata: { taskId: task.id, dueDate: task.due_date },
    })

    if (task.counselor_id) {
      await createNotification({
        counselorId: task.counselor_id,
        type: 'task_overdue',
        title: `Overdue: SOP follow-up${clientLabel}`,
        body: `"${task.task_text}" was due ${dueLabel} and is still pending. Please take action or report an update today.`,
        clientId: task.client_id ?? undefined,
        taskId: task.id,
      })
    }
  }

  return { flagged: overdueTasks.length }
}
