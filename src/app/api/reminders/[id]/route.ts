import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_OUTCOMES = ['positive', 'negative', 'neutral']

// PATCH /api/reminders/[id] — resolve a reminder with an outcome + note.
// When the outcome is positive and the reminder is linked to a task, the
// caller can also ask to close that task in the same request (defaults to
// on for positive outcomes in the UI, but always an explicit, overridable
// choice — never forced).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { outcome, outcomeNote, alsoCloseTask } = body as {
    outcome?: string
    outcomeNote?: string
    alsoCloseTask?: boolean
  }

  if (!outcome || !VALID_OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: 'Missing or invalid outcome' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: reminder } = await supabase
    .from('reminders')
    .select('id, client_id, counselor_id, task_id, status, note')
    .eq('id', id)
    .single()

  if (!reminder) {
    return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
  }
  if (reminder.status !== 'pending') {
    return NextResponse.json({ error: 'Reminder already resolved' }, { status: 400 })
  }

  const isAdmin = counselor.role === 'admin' || counselor.role === 'ceo'
  if (!isAdmin && reminder.counselor_id !== counselor.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('reminders')
    .update({
      status: 'resolved',
      outcome,
      outcome_note: outcomeNote || null,
      resolved_at: new Date().toISOString(),
      resolved_by: counselor.id,
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logActivity({
    clientId: reminder.client_id,
    counselorId: counselor.id,
    actorRole: counselor.role,
    actionType: 'reminder_resolved',
    description: `Reminder resolved (${outcome})${outcomeNote ? `: "${outcomeNote}"` : ''}`,
    metadata: { reminderId: id, outcome, taskId: reminder.task_id },
  })

  let closedLinkedTask = false

  if (alsoCloseTask && reminder.task_id) {
    const { data: task } = await supabase
      .from('tasks')
      .select('id, task_text, client_id, status')
      .eq('id', reminder.task_id)
      .maybeSingle()

    if (task && task.status !== 'closed') {
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'closed', closed_at: new Date().toISOString(), closed_by: counselor.id })
        .eq('id', task.id)

      if (!taskError) {
        closedLinkedTask = true

        await logActivity({
          clientId: task.client_id,
          counselorId: counselor.id,
          actorRole: counselor.role,
          actionType: 'task_closed',
          description: `${counselor.name} closed task following a positively-resolved reminder: "${task.task_text}"`,
          metadata: { taskId: task.id, previousStatus: task.status, newStatus: 'closed', source: 'reminder_resolution' },
        })

        await createNotification({
          counselorId: counselor.id,
          type: 'task_closed',
          title: 'Task closed',
          body: `${counselor.name}: "${task.task_text}" (follow-up resolved positively)`,
          clientId: task.client_id ?? undefined,
          taskId: task.id,
        })
      }
    }
  }

  return NextResponse.json({ success: true, closedLinkedTask })
}
