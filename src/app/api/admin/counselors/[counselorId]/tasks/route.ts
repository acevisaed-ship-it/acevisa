import { logActivity, logStaffActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { createAdminClient, getAuthenticatedAdmin } from '@/lib/supabase/server'
import { resolveTaskClient } from '@/lib/tasks/resolveTaskClient'
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

export async function GET(request: Request, { params }: RouteParams) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { counselorId } = await params
  const { target, error } = await loadAuthorizedTarget(admin, counselorId)
  if (error) return error

  const supabase = createAdminClient()
  const resolveText = new URL(request.url).searchParams.get('resolveText')
  if (resolveText != null) {
    const client = await resolveTaskClient(supabase, {
      taskText: resolveText,
      counselorId: target!.id,
      branchId: target!.branch_id,
    })
    return NextResponse.json({ client })
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select(
      'id, task_text, due_date, status, notes_count, negligence_flagged, is_milestone, assigned_by, clients(name, id)'
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
    auto_link?: boolean
    is_milestone?: boolean
  }
  const taskText = body.task_text?.trim()
  if (!taskText) {
    return NextResponse.json({ error: 'Task text is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  let linkedClient: { id: string; name: string; client_code: string | null } | null = null
  if (body.client_id) {
    const { data: picked } = await supabase
      .from('clients')
      .select('id, name, client_code')
      .eq('id', body.client_id)
      .neq('status', 'removed')
      .maybeSingle()
    if (!picked) {
      return NextResponse.json({ error: 'Student not found' }, { status: 400 })
    }
    linkedClient = picked
  } else if (body.auto_link !== false) {
    linkedClient = await resolveTaskClient(supabase, {
      taskText,
      counselorId: target!.id,
      branchId: target!.branch_id,
    })
  }

  const clientId = linkedClient?.id ?? null

  const { data: newTask, error: insertError } = await supabase
    .from('tasks')
    .insert({
      counselor_id: target!.id,
      client_id: clientId,
      task_text: taskText,
      due_date: body.due_date || null,
      status: 'open',
      source: 'assigned',
      assigned_by: admin.id,
      is_milestone: !!body.is_milestone,
    })
    .select('id, task_text, due_date, status, is_milestone')
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
    clientId: clientId || undefined,
  })

  const description = `${admin.name} assigned a task to ${target!.name}: "${taskText.slice(0, 80)}${taskText.length > 80 ? '…' : ''}"`
  if (clientId) {
    await logActivity({
      clientId,
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

  return NextResponse.json({
    success: true,
    task: newTask,
    assignedToName: target!.name,
    linkedClient,
  })
}
