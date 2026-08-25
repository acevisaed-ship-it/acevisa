import { logActivity } from '@/lib/activityLog'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId } = await params
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('task_actions')
    .select('*, counselors(name)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  return NextResponse.json({ actions: data || [] })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { counselorId, actionType, noteText, newStatus, reminderAt, visibility } = await request.json()
  const { taskId } = await params
  const supabase = createAdminClient()

  const { data: task } = await supabase
    .from('tasks')
    .select('*, clients(name, counselor_id)')
    .eq('id', taskId)
    .eq('counselor_id', counselor.id)
    .single()

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const { error: insertError } = await supabase.from('task_actions').insert({
    task_id: taskId,
    counselor_id: counselorId || counselor.id,
    action_type: actionType,
    note_text: noteText || null,
    old_status: task.status,
    new_status: newStatus || null,
    reminder_at: reminderAt || null,
    visibility: actionType === 'note' ? (visibility === 'shared' ? 'shared' : 'internal') : 'internal',
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const taskUpdate: Record<string, unknown> = {
    last_action_at: new Date().toISOString(),
    notes_count: (task.notes_count || 0) + (actionType === 'note' ? 1 : 0),
  }
  if (newStatus) {
    taskUpdate.status = newStatus
    // Track completion/close time for "tasks completed/closed today" views;
    // clear the relevant timestamp when a task is reopened.
    if (newStatus === 'completed') {
      taskUpdate.completed_at = new Date().toISOString()
    } else if (newStatus === 'closed') {
      taskUpdate.closed_at = new Date().toISOString()
      taskUpdate.closed_by = counselor.id
    } else {
      taskUpdate.completed_at = null
      taskUpdate.closed_at = null
      taskUpdate.closed_by = null
    }
  }
  if (reminderAt) taskUpdate.reminder_at = reminderAt

  const { error: updateError } = await supabase.from('tasks').update(taskUpdate).eq('id', taskId)
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const clientId = task.client_id
  const actionDescriptions: Record<string, string> = {
    note: `Counselor added note to task: "${task.task_text?.substring(0, 60)}${task.task_text?.length > 60 ? '…' : ''}"`,
    status_update: `Task status changed from ${task.status} to ${newStatus}: "${task.task_text?.substring(0, 40)}…"`,
    reminder_set: `Reminder set for task: "${task.task_text?.substring(0, 60)}…"`,
  }

  const noteVisibility = visibility === 'shared' ? 'shared' : 'internal'

  await logActivity({
    clientId,
    counselorId: counselorId || counselor.id,
    actionType: `task_${actionType}`,
    description: actionDescriptions[actionType] || `Task action: ${actionType}`,
    visibility: actionType === 'note' ? noteVisibility : 'internal',
    metadata: { task_id: taskId, note: noteText, new_status: newStatus },
  })

  return NextResponse.json({ success: true })
}
