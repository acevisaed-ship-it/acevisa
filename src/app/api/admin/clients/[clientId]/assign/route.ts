import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { createAdminClient, getAuthenticatedAdmin } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ clientId: string }> }

export async function POST(request: Request, { params }: Params) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { clientId } = await params
  const body = await request.json()
  const { counselorId, note, reason } = body as {
    counselorId?: string
    note?: string
    reason?: string
  }

  if (!counselorId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const assignedBy = admin.id
  const transferNote = note || reason

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('name, counselor_id, phone')
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  if (client.counselor_id === counselorId) {
    return NextResponse.json({ success: true, noChange: true })
  }

  const { data: counselor } = await supabase
    .from('counselors')
    .select('id, name, role, status')
    .eq('id', counselorId)
    .single()

  if (!counselor || counselor.role !== 'counselor' || counselor.status !== 'active') {
    return NextResponse.json({ error: 'Invalid counselor' }, { status: 400 })
  }

  const isTransfer = !!client.counselor_id
  const previousCounselorId = client.counselor_id

  const { error } = await supabase
    .from('clients')
    .update({
      counselor_id: counselorId,
      previous_counselor_id: previousCounselorId || null,
      assigned_by: assignedBy,
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) {
    console.error('Assign client error:', error)
    return NextResponse.json({ error: 'Assignment failed' }, { status: 500 })
  }

  await createNotification({
    counselorId,
    type: 'chat_message',
    title: isTransfer
      ? `Client transferred to you — ${client.name}`
      : `New client assigned — ${client.name}`,
    body: transferNote || (isTransfer ? 'Transferred by admin.' : 'Assigned by admin.'),
    clientId,
  })

  if (isTransfer && previousCounselorId) {
    await createNotification({
      counselorId: previousCounselorId,
      type: 'chat_message',
      title: `Client transferred — ${client.name}`,
      body: `${client.name} has been transferred to ${counselor.name}.`,
      clientId,
    })
  }

  await logActivity({
    clientId,
    counselorId: assignedBy,
    actionType: isTransfer ? 'counselor_transferred' : 'counselor_assigned',
    description: isTransfer
      ? `Client transferred to ${counselor.name}${transferNote ? `: ${transferNote}` : ''}`
      : `Client assigned to ${counselor.name} by admin`,
    metadata: {
      previousCounselorId,
      newCounselorId: counselorId,
      assignedBy,
      note: transferNote || null,
    },
  })

  return NextResponse.json({ success: true, isTransfer, counselorName: counselor.name })
}
