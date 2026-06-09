import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { formatPKTRegistrationDate } from '@/lib/pkt'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { meetingId } = await params
  const { newScheduledTime } = await request.json()

  if (!newScheduledTime) {
    return NextResponse.json({ error: 'Missing newScheduledTime' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, client_id, counselor_id, status')
    .eq('id', meetingId)
    .single()

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  }

  const isAdmin = counselor.role === 'admin'
  if (!isAdmin && meeting.counselor_id !== counselor.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (meeting.status !== 'scheduled') {
    return NextResponse.json({ error: 'Only scheduled meetings can be rescheduled' }, { status: 400 })
  }

  const { error } = await supabase
    .from('meetings')
    .update({
      scheduled_time: newScheduledTime,
      status: 'scheduled',
    })
    .eq('id', meetingId)

  if (error) {
    console.error('Meeting reschedule error:', error)
    return NextResponse.json({ error: 'Failed to reschedule meeting' }, { status: 500 })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', meeting.client_id)
    .single()

  const clientName = client?.name ?? 'client'
  const formattedTime = formatPKTRegistrationDate(newScheduledTime)

  await logActivity({
    clientId: meeting.client_id,
    counselorId: counselor.id,
    actionType: 'meeting_rescheduled',
    description: `Meeting rescheduled to ${formattedTime}`,
    metadata: { meetingId, scheduledTime: newScheduledTime },
  })

  const notifyCounselorId = meeting.counselor_id ?? counselor.id
  await createNotification({
    counselorId: notifyCounselorId,
    type: 'meeting_request',
    title: `Meeting rescheduled — ${clientName}`,
    body: `Rescheduled to ${formattedTime}`,
    clientId: meeting.client_id,
    meetingId,
  })

  return NextResponse.json({ success: true, scheduledTime: newScheduledTime })
}
