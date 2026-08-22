import { logActivity, logStaffActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { createAdminClient, getAuthenticatedAdmin } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ counselorId: string }> }

async function loadAuthorizedTarget(
  admin: { id: string; role: string; branch_id: string | null },
  counselorId: string
) {
  const supabase = createAdminClient()
  const { data: target } = await supabase
    .from('counselors')
    .select('id, name, role, status, branch_id')
    .eq('id', counselorId)
    .single()

  if (!target || target.status !== 'active') {
    return { target: null, error: NextResponse.json({ error: 'Staff member not found' }, { status: 404 }) }
  }

  const allowed =
    admin.role === 'ceo'
      ? target.role === 'counselor' || target.role === 'admin'
      : admin.role === 'admin'
        ? target.role === 'counselor' && target.branch_id === admin.branch_id
        : false

  if (!allowed) {
    return { target: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { target, error: null }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { counselorId } = await params
  const { target, error } = await loadAuthorizedTarget(admin, counselorId)
  if (error) return error

  const supabase = createAdminClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select(
      'id, task_text, due_date, status, notes_count, negligence_flagged, assigned_by, clients(name, id)'
    )
    .eq('counselor_id', target!.id)
    .order('due_date', { ascending: true, nullsFirst: false })

  return NextResponse.json({ tasks: tasks ?? [], counselorId: target!.id })
}

export async function POST(request: Request, { params }: RouteParams) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { counselorId } = await params
  const { target, error } = await loadAuthorizedTarget(admin, counselorId)
  if (error) return error

  const body = await request.json() as {
    task_text?: string
    due_date?: string
    client_id?: string
  }
  const taskText = body.task_text?.trim()
  if (!taskText) {
    return NextResponse.json({ error: 'Task text is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: newTask, error: insertError } = await supabase
    .from('tasks')
    .insert({
      counselor_id: target!.id,
      client_id: body.client_id || null,
      task_text: taskText,
      due_date: body.due_date || null,
      status: 'open',
      assigned_by: admin.id,
    })
    .select('id, task_text, due_date, status')
    .single()

  if (insertError || !newTask) {
    console.error('[admin/counselors/tasks] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }

  await createNotification({
    counselorId: target!.id,
    type: 'task_assigned',
    title: `New task from ${admin.name}`,
    body: taskText,
    taskId: newTask.id,
    clientId: body.client_id || undefined,
  })

  const description = `${admin.name} assigned a task to ${target!.name}: "${taskText.slice(0, 80)}${taskText.length > 80 ? '…' : ''}"`
  if (body.client_id) {
    await logActivity({
      clientId: body.client_id,
      counselorId: admin.id,
      actorRole: admin.role,
      actionType: 'task_assigned',
      description,
      metadata: { taskId: newTask.id, assignedTo: target!.id },
    })
  } else {
    await logStaffActivity({
      counselorId: admin.id,
      actorRole: admin.role,
      actionType: 'task_assigned',
      description,
      metadata: { taskId: newTask.id, assignedTo: target!.id },
    })
  }

  return NextResponse.json({ success: true, task: newTask, assignedToName: target!.name })
}
