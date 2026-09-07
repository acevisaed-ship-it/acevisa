import type { SupabaseClient } from '@supabase/supabase-js'
import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { draftTask } from '@/lib/agentDrafts'
import { formatPKTDate, getPKTDayBounds } from '@/lib/pkt'

/**
 * A counselor sets a reminder for themselves against a client, due on a
 * specific date. If that date passes and the reminder is still 'pending' —
 * they never resolved it (positive/negative/neutral outcome) — nothing in
 * the app used to notice. This closes that gap:
 *
 * 1. A new task is created for the counselor spelling out that the
 *    reminder needs an update, so it's not just sitting silently in a
 *    profile widget they may have forgotten about.
 * 2. The CEO is informed via a CEO Agent draft (same review queue as the
 *    retention-risk rule) — get an update from the counselor, or send them
 *    a nudge, rather than only finding out if they happen to check.
 *
 * Each reminder is only ever processed once (escalated flag), so re-running
 * the cron daily doesn't pile up duplicate tasks/drafts for the same miss.
 */
export async function checkStaleReminders(supabase: SupabaseClient, todayPKT: string) {
  const { startUTC } = getPKTDayBounds(todayPKT)

  const { data: stale, error } = await supabase
    .from('reminders')
    .select('id, client_id, counselor_id, remind_at, note, clients(name), counselors!reminders_counselor_id_fkey(name)')
    .eq('status', 'pending')
    .eq('escalated', false)
    .lt('remind_at', startUTC)

  if (error) {
    console.error('[checkStaleReminders] fetch failed:', error.message)
    return { followedUp: 0 }
  }
  if (!stale || stale.length === 0) return { followedUp: 0 }

  let followedUp = 0

  for (const reminder of stale) {
    const client = reminder.clients as unknown as { name: string } | null
    const counselor = reminder.counselors as unknown as { name: string } | null
    const clientName = client?.name ?? 'this client'
    const counselorName = counselor?.name ?? 'The counselor'
    const dueLabel = formatPKTDate(reminder.remind_at)
    const noteLabel = reminder.note ? ` ("${reminder.note}")` : ''

    // 1. Follow-up task for the counselor.
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        counselor_id: reminder.counselor_id,
        client_id: reminder.client_id,
        task_text: `Update needed: your ${dueLabel} reminder for ${clientName}${noteLabel} was never resolved — check in and decide next steps.`,
        due_date: new Date().toISOString(),
        status: 'open',
        source: 'reminder_followup',
      })
      .select('id')
      .single()

    if (taskError) {
      console.error('[checkStaleReminders] task creation failed:', taskError.message)
    } else if (newTask) {
      await createNotification({
        counselorId: reminder.counselor_id,
        type: 'task_assigned',
        title: `Reminder needs an update — ${clientName}`,
        body: `Your ${dueLabel} reminder${noteLabel} was never resolved. A follow-up task was added to your list.`,
        clientId: reminder.client_id,
        taskId: newTask.id,
      })
    }

    await logActivity({
      clientId: reminder.client_id,
      counselorId: reminder.counselor_id,
      actorRole: 'system',
      actionType: 'reminder_stale_followup',
      description: `Reminder set for ${dueLabel}${noteLabel} was never resolved — auto-created a follow-up task`,
      metadata: { reminderId: reminder.id, taskId: newTask?.id ?? null },
    })

    // 2. Inform the CEO via the standard agent-draft review queue.
    await draftTask({
      targetCounselorId: null,
      clientId: reminder.client_id,
      title: `Reminder overdue: ${clientName}`,
      body: `${counselorName} set a reminder for ${clientName} due ${dueLabel}${noteLabel} and never resolved it. Get an update from them, or send a nudge — a follow-up task has been added to their list.`,
      sourceRule: 'stale_reminder_followup',
      metadata: { reminderId: reminder.id, counselorId: reminder.counselor_id, counselorName, dueLabel },
      dedupeKey: reminder.id,
    })

    // 3. Never process this reminder again.
    await supabase
      .from('reminders')
      .update({ escalated: true, escalated_at: new Date().toISOString() })
      .eq('id', reminder.id)

    followedUp++
  }

  return { followedUp }
}
