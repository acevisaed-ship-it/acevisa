import { createAdminClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { getTodayPKTDateString, getPKTDayBounds, formatPKTDate } from '@/lib/pkt'
import { NextResponse } from 'next/server'

// Runs on a schedule (see vercel.json) and does the one thing nothing else in
// the app does: actually sets tasks.negligence_flagged = true once a pending
// task's due date has passed. Every dashboard (CEO analytics, HR flags,
// counselor performance) already reads this column — it was just never being
// written, so overdue tasks silently never showed up as a productivity flag
// anywhere.
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()
  const todayPKT = getTodayPKTDateString()
  const { startUTC } = getPKTDayBounds(todayPKT)

  // "Overdue" = due_date's PKT calendar day is before today's PKT calendar
  // day — same threshold isOverdueInPKT() uses for UI row-coloring, kept in
  // sync here so the flag and the visual warning always agree.
  const { data: overdueTasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id, task_text, due_date, counselor_id, client_id, clients(name)')
    .eq('status', 'pending')
    .eq('negligence_flagged', false)
    .not('due_date', 'is', null)
    .lt('due_date', startUTC)

  if (fetchError) {
    console.error('[cron/flag-overdue-tasks] fetch failed:', fetchError.message)
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
  }

  if (!overdueTasks || overdueTasks.length === 0) {
    return NextResponse.json({ success: true, flagged: 0 })
  }

  const ids = overdueTasks.map((t) => t.id)
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ negligence_flagged: true })
    .in('id', ids)

  if (updateError) {
    console.error('[cron/flag-overdue-tasks] update failed:', updateError.message)
    return NextResponse.json({ error: 'Failed to flag tasks' }, { status: 500 })
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

    // The counselor whose SOP follow-up is overdue must be alerted directly —
    // fans out to branch admin + CEO too (client-attached event).
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

  return NextResponse.json({ success: true, flagged: overdueTasks.length })
}
