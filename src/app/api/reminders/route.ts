import { logActivity } from '@/lib/activityLog'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/reminders?clientId=... — reminders for the standing profile
// widget: pending ones first (soonest due first), then recently resolved.
export async function GET(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const isAdmin = counselor.role === 'admin' || counselor.role === 'ceo'

  const clientQuery = supabase.from('clients').select('id').eq('id', clientId)
  const { data: client } = isAdmin
    ? await clientQuery.maybeSingle()
    : await clientQuery.eq('counselor_id', counselor.id).maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const [{ data: pending }, { data: resolved }] = await Promise.all([
    supabase
      .from('reminders')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .order('remind_at', { ascending: true }),
    supabase
      .from('reminders')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'resolved')
      .order('resolved_at', { ascending: false })
      .limit(5),
  ])

  return NextResponse.json({
    reminders: [...(pending ?? []), ...(resolved ?? [])],
  })
}

// POST /api/reminders — self-set follow-up reminder. Fully manual, always
// optional; either entry point (task-completion prompt or the profile
// widget) hits this same endpoint.
export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { clientId, taskId, remindAt, note } = body as {
    clientId?: string
    taskId?: string
    remindAt?: string
    note?: string
  }

  if (!clientId || !remindAt) {
    return NextResponse.json({ error: 'Missing clientId or remindAt' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const isAdmin = counselor.role === 'admin' || counselor.role === 'ceo'

  const clientQuery = supabase.from('clients').select('id, name').eq('id', clientId)
  const { data: client } = isAdmin
    ? await clientQuery.maybeSingle()
    : await clientQuery.eq('counselor_id', counselor.id).maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const { data: reminder, error } = await supabase
    .from('reminders')
    .insert({
      client_id: clientId,
      counselor_id: counselor.id,
      task_id: taskId || null,
      remind_at: remindAt,
      note: note || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logActivity({
    clientId,
    counselorId: counselor.id,
    actorRole: counselor.role,
    actionType: 'reminder_set',
    description: `Follow-up reminder set for ${new Date(remindAt).toLocaleString('en-PK')}${note ? `: "${note}"` : ''}`,
    metadata: { reminderId: reminder.id, taskId: taskId || null },
  })

  return NextResponse.json({ success: true, reminder })
}
