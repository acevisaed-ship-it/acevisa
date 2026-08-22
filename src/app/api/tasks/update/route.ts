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

  if (!taskId || !status) {
    return NextResponse.json({ error: 'Missing taskId or status' }, { status: 400 })
  }

  const update: Record<string, string | null> = { status }
  if (due_date) update.due_date = due_date
  // Track completion time for "tasks completed today" views; clear it if the
  // task is reopened back to pending.
  if (status === 'completed') update.completed_at = new Date().toISOString()
  if (status === 'pending') update.completed_at = null

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
  // counselor marks a task completed, or pushes it back to pending
  // (re-opens/defers it) — both are accountability events on client SOP
  // follow-ups, and must also surface in Staff Activity / Logs.
  if (existingTask && status !== existingTask.status && (status === 'completed' || status === 'pending')) {
    const client = existingTask.clients as unknown as { name: string } | null
    const clientLabel = client?.name ? ` for ${client.name}` : ''

    await createNotification({
      counselorId: counselor.id,
      type: status === 'completed' ? 'task_completed' : 'task_pending',
      title:
        status === 'completed'
          ? `Task completed${clientLabel}`
          : `Task marked pending${clientLabel}`,
      body: `${counselor.name}: "${existingTask.task_text}"`,
      clientId: existingTask.client_id ?? undefined,
      taskId,
    })

    await logActivity({
      clientId: existingTask.client_id,
      counselorId: counselor.id,
      actorRole: counselor.role,
      actionType: status === 'completed' ? 'task_completed' : 'task_marked_pending',
      description: `${counselor.name} marked task${clientLabel} as ${status}: "${existingTask.task_text}"`,
      metadata: { taskId, previousStatus: existingTask.status, newStatus: status },
    })
  }

  return NextResponse.json({ success: true })
}
