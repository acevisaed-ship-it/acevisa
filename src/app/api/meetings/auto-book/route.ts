import { logActivity } from '@/lib/activityLog'
import { anthropic } from '@/lib/anthropic'
import { createNotification } from '@/lib/notifications'
import { createAdminClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/utils'
import { NextResponse } from 'next/server'

type ExtractionResult = {
  date: string
  hour: number
  ambiguous: boolean
  past: boolean
  reason: string
}

function parseExtraction(raw: string): ExtractionResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0]) as ExtractionResult
  } catch {
    return null
  }
}

async function findNextAvailableSlots(
  supabase: ReturnType<typeof createAdminClient>,
  counselorId: string,
  fromTime: Date,
  count: number
): Promise<Date[]> {
  const slots: Date[] = []
  const check = new Date(fromTime)
  const maxDays = 3

  for (let day = 0; day <= maxDays && slots.length < count; day++) {
    const dayStart = new Date(check)
    dayStart.setUTCDate(dayStart.getUTCDate() + day)
    if (day === 0) {
      dayStart.setUTCMinutes(dayStart.getUTCMinutes() + 30)
    } else {
      dayStart.setUTCHours(4, 0, 0, 0)
    }

    const pktDay = new Date(dayStart.getTime() + 5 * 60 * 60 * 1000).getDay()
    if (pktDay === 0) continue

    const dayEndUTC = new Date(dayStart)
    dayEndUTC.setUTCHours(13, 0, 0, 0)

    const candidate = new Date(dayStart)
    while (candidate < dayEndUTC && slots.length < count) {
      const candidateEnd = new Date(candidate.getTime() + 30 * 60 * 1000)

      const { data: conflict } = await supabase
        .from('meetings')
        .select('id')
        .eq('counselor_id', counselorId)
        .eq('status', 'scheduled')
        .gte('scheduled_time', candidate.toISOString())
        .lt('scheduled_time', candidateEnd.toISOString())
        .maybeSingle()

      if (!conflict) {
        slots.push(new Date(candidate))
      }

      candidate.setUTCMinutes(candidate.getUTCMinutes() + 30)
    }
  }

  return slots
}

export async function POST(request: Request) {
  const { clientId, message, client } = await request.json()
  console.log('Auto-book API called:', { clientId, messagePreview: message?.slice(0, 80) })

  if (!clientId || !message) {
    return NextResponse.json({ handled: false })
  }

  const supabase = createAdminClient()

  const today = new Date()
  const todayPKT = new Date(today.getTime() + 5 * 60 * 60 * 1000)
  const todayStr = todayPKT.toISOString().split('T')[0]

  const extractionPrompt = `Today's date is ${todayStr} (Pakistan Standard Time, UTC+5).
A student sent this message: "${message}"

Extract the meeting date and time they are requesting.
Respond ONLY with a JSON object in this exact format:
{
  "date": "YYYY-MM-DD",
  "hour": 10,
  "ambiguous": false,
  "past": false,
  "reason": ""
}

Rules:
- "date": the specific date they want (YYYY-MM-DD). If they say "tomorrow", calculate from today.
- "hour": the hour in 24-hour format PKT (9–18 only). If they say "morning" use 10, "afternoon" use 14, "evening" use 16.
- "ambiguous": true if the time is too vague to book (e.g. "sometime next week" with no day or time).
- "past": true if the requested date/time is in the past.
- "reason": brief explanation only if ambiguous or past, otherwise empty string.

Respond with ONLY the JSON. No explanation.`

  const extraction = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 150,
    messages: [{ role: 'user', content: extractionPrompt }],
  })

  const raw =
    extraction.content[0].type === 'text' ? extraction.content[0].text : '{}'
  const parsed = parseExtraction(raw.trim())

  if (!parsed) {
    return NextResponse.json({ handled: false })
  }

  if (parsed.ambiguous) {
    return NextResponse.json({
      handled: true,
      responseMessage: `I'd love to help you book a meeting! Could you give me a specific date and time? For example: "Friday at 3pm" or "Monday morning". Our counselors are available Monday–Saturday, 9am–6pm PKT.`,
    })
  }

  if (parsed.past) {
    return NextResponse.json({
      handled: true,
      responseMessage: `That date has already passed! Could you share a future date and time you'd prefer? We're available Monday–Saturday, 9am–6pm PKT.`,
    })
  }

  if (parsed.hour < 9 || parsed.hour >= 18) {
    return NextResponse.json({
      handled: true,
      responseMessage: `Our counselors are available between 9am and 6pm PKT, Monday to Saturday. Could you pick a time within those hours?`,
    })
  }

  const requestedDate = new Date(
    `${parsed.date}T${String(parsed.hour).padStart(2, '0')}:00:00+05:00`
  )
  if (requestedDate.getDay() === 0) {
    return NextResponse.json({
      handled: true,
      responseMessage: `We're closed on Sundays! Our counselors are available Monday–Saturday, 9am–6pm PKT. Would another day work for you?`,
    })
  }

  const { data: existingMeeting } = await supabase
    .from('meetings')
    .select('id, scheduled_time')
    .eq('client_id', clientId)
    .eq('status', 'scheduled')
    .maybeSingle()

  if (existingMeeting) {
    const meetingPKT = new Date(
      new Date(existingMeeting.scheduled_time).getTime() + 5 * 60 * 60 * 1000
    )
    const meetingLabel = meetingPKT.toLocaleString('en-PK', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    return NextResponse.json({
      handled: true,
      responseMessage: `You already have a meeting scheduled for ${meetingLabel} PKT. Would you like to reschedule it? If so, please let me know and I'll flag it for the counselor.`,
    })
  }

  let counselorId: string | null = client?.counselor_id || null
  if (!counselorId) {
    const { data: counselors } = await supabase
      .from('counselors')
      .select('id')
      .eq('status', 'active')
      .limit(1)
    counselorId = counselors?.[0]?.id || null
  }

  const [year, month, day] = parsed.date.split('-').map(Number)
  const requestedUTC = new Date(
    Date.UTC(year, month - 1, day, parsed.hour - 5, 0, 0)
  )

  const slotStart = requestedUTC
  const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)

  if (counselorId) {
    const { data: slotConflict } = await supabase
      .from('meetings')
      .select('id')
      .eq('counselor_id', counselorId)
      .eq('status', 'scheduled')
      .gte('scheduled_time', slotStart.toISOString())
      .lt('scheduled_time', slotEnd.toISOString())
      .maybeSingle()

    if (slotConflict) {
      const alternatives = await findNextAvailableSlots(
        supabase,
        counselorId,
        requestedUTC,
        3
      )

      if (alternatives.length === 0) {
        return NextResponse.json({
          handled: true,
          responseMessage: `That time slot is already booked. Unfortunately I couldn't find any nearby available slots either. A counselor will reach out to schedule something that works. You can also use the "Book a slot" button to browse all available times.`,
        })
      }

      const altList = alternatives
        .map((slot) => {
          const pkt = new Date(slot.getTime() + 5 * 60 * 60 * 1000)
          return pkt.toLocaleString('en-PK', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        })
        .join('\n• ')

      return NextResponse.json({
        handled: true,
        responseMessage: `That time slot is already taken. Here are the next available slots:\n\n• ${altList} PKT\n\nReply with which one you'd prefer and I'll book it for you!`,
      })
    }
  }

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      client_id: clientId,
      counselor_id: counselorId,
      scheduled_time: requestedUTC.toISOString(),
      status: 'scheduled',
      pre_brief_sent: false,
    })
    .select('id')
    .single()

  if (error || !meeting) {
    console.error('Auto-booking error:', error)
    return NextResponse.json({
      handled: true,
      responseMessage: `I ran into an issue booking that slot. Please use the "Book a slot" button or contact us directly and we'll get it sorted.`,
    })
  }

  const confirmedPKT = new Date(requestedUTC.getTime() + 5 * 60 * 60 * 1000)
  const confirmedLabel = confirmedPKT.toLocaleString('en-PK', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  await supabase
    .from('clients')
    .update({
      pipeline_stage: 2,
      ...(counselorId ? { counselor_id: counselorId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (counselorId) {
    const { error: taskError } = await supabase.from('tasks').insert({
      counselor_id: counselorId,
      client_id: clientId,
      task_text: `Meeting auto-booked by student for ${confirmedLabel} PKT. Review and confirm.`,
      due_date: new Date(requestedUTC.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'open',
    })
    if (taskError) {
      console.error('[meetings/auto-book] task insert failed:', taskError.message)
    }

    await createNotification({
      counselorId,
      type: 'meeting_request',
      title: `Meeting auto-booked — ${client?.name || 'Student'}`,
      body: `${confirmedLabel} PKT — booked automatically from chat.`,
      clientId,
      meetingId: meeting.id,
    })
  }

  await logActivity({
    clientId,
    counselorId: counselorId ?? undefined,
    actionType: 'meeting_scheduled',
    description: `Meeting auto-booked from chat for ${confirmedLabel} PKT`,
    metadata: {
      meetingId: meeting.id,
      scheduledTime: requestedUTC.toISOString(),
      bookedBy: 'auto',
    },
  })

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
    console.error('Email notification failed (non-fatal):', err)
  }

  return NextResponse.json({
    handled: true,
    responseMessage: `Done! ✅ Your meeting has been booked for **${confirmedLabel} PKT**. Your counselor has been notified and will confirm shortly. You'll receive a reminder before the meeting. See you then!`,
  })
}
