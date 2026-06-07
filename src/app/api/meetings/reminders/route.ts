import { createAdminClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/utils'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()
  const now = new Date()

  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  const { data: meetings24h } = await supabase
    .from('meetings')
    .select('id, client_id, counselor_id, scheduled_time')
    .eq('status', 'scheduled')
    .gte('scheduled_time', in23h.toISOString())
    .lte('scheduled_time', in25h.toISOString())

  for (const meeting of meetings24h || []) {
    await fetch(`${getBaseUrl()}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'meeting_reminder_24h',
        clientId: meeting.client_id,
        meetingId: meeting.id,
      }),
    })
  }

  const in105m = new Date(now.getTime() + 105 * 60 * 1000)
  const in135m = new Date(now.getTime() + 135 * 60 * 1000)

  const { data: meetings2h } = await supabase
    .from('meetings')
    .select('id, client_id, counselor_id, scheduled_time')
    .eq('status', 'scheduled')
    .gte('scheduled_time', in105m.toISOString())
    .lte('scheduled_time', in135m.toISOString())

  for (const meeting of meetings2h || []) {
    await fetch(`${getBaseUrl()}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'meeting_reminder_2h',
        clientId: meeting.client_id,
        meetingId: meeting.id,
      }),
    })
  }

  return NextResponse.json({
    success: true,
    processed: (meetings24h?.length || 0) + (meetings2h?.length || 0),
  })
}
