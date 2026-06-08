import { logActivity } from '@/lib/activityLog'
import { createAdminClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/utils'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { clientId, counselorId, scheduledTimeUTC } = await request.json()

  if (!clientId || !scheduledTimeUTC) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const scheduledDate = new Date(scheduledTimeUTC)

  const { data: conflicts } = await supabase
    .from('meetings')
    .select('id')
    .eq('status', 'scheduled')
    .gte(
      'scheduled_time',
      new Date(scheduledDate.getTime() - 30 * 60 * 1000).toISOString()
    )
    .lte(
      'scheduled_time',
      new Date(scheduledDate.getTime() + 30 * 60 * 1000).toISOString()
    )
    .limit(1)

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: 'Slot no longer available' }, { status: 409 })
  }

  let finalCounselorId = counselorId && counselorId !== 'default' ? counselorId : null
  if (!finalCounselorId) {
    const { data: counselors } = await supabase
      .from('counselors')
      .select('id')
      .eq('status', 'active')
      .limit(1)
    finalCounselorId = counselors?.[0]?.id || null
  }

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      client_id: clientId,
      counselor_id: finalCounselorId,
      scheduled_time: scheduledTimeUTC,
      status: 'scheduled',
      pre_brief_sent: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Meeting insert error:', error)
    return NextResponse.json({ error: 'Failed to schedule meeting' }, { status: 500 })
  }

  await logActivity({
    clientId,
    counselorId: finalCounselorId ?? undefined,
    actionType: 'meeting_scheduled',
    description: `Meeting scheduled for ${scheduledTimeUTC}`,
    metadata: { meetingId: meeting.id, scheduledTime: scheduledTimeUTC },
  })

  await supabase
    .from('clients')
    .update({
      pipeline_stage: 2,
      ...(finalCounselorId ? { counselor_id: finalCounselorId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  try {
    await fetch(`${getBaseUrl()}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'meeting_confirmation',
        clientId,
        meetingId: meeting.id,
        scheduledTimeUTC,
      }),
    })
  } catch (emailError) {
    console.error('Email notification failed (non-fatal):', emailError)
  }

  return NextResponse.json({ success: true, meetingId: meeting.id })
}
