import { createAdminClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/utils'
import { NextResponse } from 'next/server'

const TIME_MAP: Record<string, number> = {
  morning: 9,
  afternoon: 12,
  evening: 15,
}

export async function POST(request: Request) {
  const { clientId, preferredDate, preferredTimeOfDay, note } = await request.json()

  if (!clientId || !preferredDate || !preferredTimeOfDay) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('meetings')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'scheduled')
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      {
        error:
          'You already have a meeting scheduled. Check your confirmation message.',
      },
      { status: 409 }
    )
  }

  const { data: client } = await supabase
    .from('clients')
    .select('counselor_id, name')
    .eq('id', clientId)
    .single()

  const pktHour = TIME_MAP[preferredTimeOfDay] ?? 10
  const [year, month, day] = preferredDate.split('-').map(Number)
  const scheduledUTC = new Date(Date.UTC(year, month - 1, day, pktHour - 5, 0, 0))

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      client_id: clientId,
      counselor_id: client?.counselor_id || null,
      scheduled_time: scheduledUTC.toISOString(),
      status: 'scheduled',
      pre_brief_sent: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Meeting request error:', error)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }

  if (note) {
    await supabase.from('conversations').insert({
      client_id: clientId,
      message_text: `Meeting request note: ${note}`,
      sender: 'student',
      stage_tag: 'meeting_request',
    })
  }

  if (client?.counselor_id) {
    await supabase.from('tasks').insert({
      counselor_id: client.counselor_id,
      client_id: clientId,
      task_text: `${client.name} requested a meeting on ${preferredDate} (${preferredTimeOfDay}). Confirm or reschedule.`,
      due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    })
  }

  try {
    await fetch(`${getBaseUrl()}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'meeting_confirmation',
        clientId,
        meetingId: meeting.id,
      }),
    })
  } catch (err) {
    console.error('Notification failed (non-fatal):', err)
  }

  return NextResponse.json({ success: true, meetingId: meeting.id })
}
