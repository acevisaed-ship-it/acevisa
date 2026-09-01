import { logActivity } from '@/lib/activityLog'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { resolveTaskClient } from '@/lib/tasks/resolveTaskClient'
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
  const { data, error } = await supabase
    .from('task_actions')
    .select('*, counselors(name)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[task actions GET]', error.message)
    return NextResponse.json({ error: 'Failed to load task history' }, { status: 500 })
  }

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

  const { actionType, noteText, newStatus, reminderAt, visibility } = await request.json()
  const { taskId } = await params
  const supabase = createAdminClient()

  const { data: task } = await supabase
    .from('tasks')
    .select('*, clients(name, counselor_id)')
    .eq('id', taskId)
    .maybeSingle()

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const isLeadership = counselor.role === 'admin' || counselor.role === 'ceo'
  if (task.counselor_id !== counselor.id && !isLeadership) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const { error: insertError } = await supabase.from('task_actions').insert({
    task_id: taskId,
    counselor_id: counselor.id,
    action_type: actionType,
    note_text: noteText || null,
    old_status: task.status,
    new_status: newStatus || null,
    reminder_at: reminderAt || null,
    visibility: actionType === 'note' ? (visibility === 'shared' ? 'shared' : 'internal') : 'internal',
  })

  if (insertError) {
    console.error('[task actions POST] insert failed:', insertError.message)
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

  let clientId = (task.client_id as string | null) ?? null
  let linkedClient: { id: string; name: string; client_code: string | null } | null = null
  const existingClient = task.clients as { name?: string } | { name?: string }[] | null
  const existingName = Array.isArray(existingClient)
    ? existingClient[0]?.name
    : existingClient?.name
  if (clientId && existingName) {
    linkedClient = { id: clientId, name: existingName, client_code: null }
  } else if (!clientId) {
    linkedClient = await resolveTaskClient(supabase, {
      taskText: String(task.task_text ?? ''),
      counselorId: task.counselor_id,
    })
    if (linkedClient) {
      clientId = linkedClient.id
      taskUpdate.client_id = linkedClient.id
    }
  }

  const { error: updateError } = await supabase.from('tasks').update(taskUpdate).eq('id', taskId)
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const taskLabel = String(task.task_text ?? '')
  const shortTask = `${taskLabel.substring(0, 60)}${taskLabel.length > 60 ? '…' : ''}`
  const noteSnippet = typeof noteText === 'string' ? noteText.trim() : ''

  const actionDescriptions: Record<string, string> = {
    note: noteSnippet
      ? `${counselor.name}: ${noteSnippet}`
      : `${counselor.name} added a note on task: "${shortTask}"`,
    status_update: `${counselor.name} changed task from ${task.status} to ${newStatus}: "${shortTask}"`,
    reminder_set: `${counselor.name} set a reminder on task: "${shortTask}"`,
  }

  const noteVisibility = visibility === 'shared' ? 'shared' : 'internal'

  const { error: logError } = await logActivity({
    clientId,
    counselorId: counselor.id,
    actorRole: counselor.role,
    actionType: `task_${actionType}`,
    description: actionDescriptions[actionType] || `Task action: ${actionType}`,
    visibility: actionType === 'note' ? noteVisibility : 'internal',
    metadata: { task_id: taskId, task_text: taskLabel, note: noteSnippet || null, new_status: newStatus },
  })

  if (logError) {
    console.error('[task actions POST] activity log failed:', logError)
  }

  return NextResponse.json({ success: true, linkedClient })
}
