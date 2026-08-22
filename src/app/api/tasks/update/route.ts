import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { taskId, status, due_date } = body as {
    taskId?: string
    status?: string
    due_date?: string
  }

  const VALID_STATUSES = ['open', 'in_progress', 'completed', 'closed']
  if (!taskId || !status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Missing taskId or invalid status' }, { status: 400 })
  }

  const update: Record<string, string | null> = { status }
  if (due_date) update.due_date = due_date
  // Track completion/close time for "tasks completed/closed today" views;
  // clear the relevant timestamp if the task is reopened.
  if (status === 'completed') {
    update.completed_at = new Date().toISOString()
  } else if (status === 'closed') {
    update.closed_at = new Date().toISOString()
    update.closed_by = counselor.id
  } else {
    update.completed_at = null
    update.closed_at = null
    update.closed_by = null
  }

  const supabase = createAdminClient()

  const { data: existingTask } = await supabase
    .from('tasks')
    .select('task_text, client_id, status, clients(name)')
    .eq('id', taskId)
    .eq('counselor_id', counselor.id)
    .maybeSingle()

  const { error } = await supabase
    .from('tasks')
    .update(update)
    .eq('id', taskId)
    .eq('counselor_id', counselor.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // SOP: leadership (branch admin + CEO) must be notified whenever a
  // counselor changes a task's status — an accountability signal on client
  // SOP follow-ups that must also surface in Staff Activity / Logs.
  if (existingTask && status !== existingTask.status) {
    const client = existingTask.clients as unknown as { name: string } | null
    const clientLabel = client?.name ? ` for ${client.name}` : ''
    const STATUS_LABEL: Record<string, string> = {
      open: 'reopened',
      in_progress: 'marked in progress',
      completed: 'completed',
      closed: 'closed',
    }
    const NOTIF_TYPE: Record<string, 'task_completed' | 'task_pending' | 'task_closed'> = {
      open: 'task_pending',
      in_progress: 'task_pending',
      completed: 'task_completed',
      closed: 'task_closed',
    }

    await createNotification({
      counselorId: counselor.id,
      type: NOTIF_TYPE[status],
      title: `Task ${STATUS_LABEL[status]}${clientLabel}`,
      body: `${counselor.name}: "${existingTask.task_text}"`,
      clientId: existingTask.client_id ?? undefined,
      taskId,
    })

    await logActivity({
      clientId: existingTask.client_id,
      counselorId: counselor.id,
      actorRole: counselor.role,
      actionType: `task_${status}`,
      description: `${counselor.name} ${STATUS_LABEL[status]} task${clientLabel}: "${existingTask.task_text}"`,
      metadata: { taskId, previousStatus: existingTask.status, newStatus: status },
    })
  }

  return NextResponse.json({ success: true })
}
