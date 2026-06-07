import { createAdminClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/utils'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

type NotificationType =
  | 'meeting_confirmation'
  | 'meeting_reminder_24h'
  | 'meeting_reminder_2h'
  | 'escalation_alert'

function formatMeetingTimePKT(scheduledTime: string): string {
  const pktTime = new Date(new Date(scheduledTime).getTime() + 5 * 60 * 60 * 1000)
  return pktTime.toLocaleString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function POST(request: Request) {
  const { type, clientId, meetingId, counselorId } = await request.json()

  const supabase = createAdminClient()

  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set — skipping email for type:', type)
    return NextResponse.json({ skipped: true })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { data: client } = await supabase
    .from('clients')
    .select('name, phone')
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // clients table has no email field — email is collected in Phase 2.
  const clientEmail: string | null = null

  let subject = ''
  let html = ''
  let recipient: string | null = clientEmail
  let status: 'sent' | 'skipped' | 'failed' = 'sent'

  if (
    type === 'meeting_confirmation' ||
    type === 'meeting_reminder_24h' ||
    type === 'meeting_reminder_2h'
  ) {
    const { data: meeting } = await supabase
      .from('meetings')
      .select('scheduled_time, counselors(name, email)')
      .eq('id', meetingId)
      .single()

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    const timeLabel = formatMeetingTimePKT(meeting.scheduled_time)
    const counselorData = meeting.counselors
    const counselor = Array.isArray(counselorData)
      ? counselorData[0]
      : counselorData
    const counselorName = counselor?.name || 'Your Counselor'

    if (type === 'meeting_confirmation') {
      subject = 'Your meeting is confirmed — AceVisa'
      html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#0A3F3A;background:#E6E8E7;padding:32px;border-radius:16px">
          <h2 style="color:#2083B9">You're booked, ${client.name}!</h2>
          <p>Your meeting with <strong>${counselorName}</strong> is confirmed:</p>
          <p style="font-size:20px;font-weight:bold;color:#E48328;background:#fff;padding:16px;border-radius:12px">${timeLabel} PKT</p>
          <p>Your counselor will review your case fully before the meeting. Come prepared with any questions you have.</p>
          <p style="margin-top:32px;color:#0A3F3A">— The AceVisa Team</p>
        </div>`
    }

    if (type === 'meeting_reminder_24h') {
      subject = 'Reminder: Your AceVisa meeting is tomorrow'
      html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#0A3F3A;background:#E6E8E7;padding:32px;border-radius:16px">
          <h2 style="color:#2083B9">See you tomorrow, ${client.name}!</h2>
          <p>Just a reminder — your meeting with <strong>${counselorName}</strong> is:</p>
          <p style="font-size:20px;font-weight:bold;color:#E48328;background:#fff;padding:16px;border-radius:12px">${timeLabel} PKT</p>
          <p>If you need to reschedule, reply to this email or contact us directly.</p>
          <p style="margin-top:32px;color:#0A3F3A">— The AceVisa Team</p>
        </div>`
    }

    if (type === 'meeting_reminder_2h') {
      subject = 'Your meeting starts in 2 hours — AceVisa'
      html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#0A3F3A;background:#E6E8E7;padding:32px;border-radius:16px">
          <h2 style="color:#2083B9">Almost time, ${client.name}!</h2>
          <p>Your meeting with <strong>${counselorName}</strong> starts in 2 hours:</p>
          <p style="font-size:20px;font-weight:bold;color:#E48328;background:#fff;padding:16px;border-radius:12px">${timeLabel} PKT</p>
          <p style="margin-top:32px;color:#0A3F3A">— The AceVisa Team</p>
        </div>`
    }
  }

  if (type === 'escalation_alert') {
    const { data: counselor } = await supabase
      .from('counselors')
      .select('email, name')
      .eq('id', counselorId)
      .single()

    if (!counselor) {
      return NextResponse.json({ error: 'Counselor not found' }, { status: 404 })
    }

    const { data: escalation } = await supabase
      .from('escalations')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'open')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    recipient = counselor.email
    subject = 'Student question needs your input — AceVisa'
    html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#0A3F3A;background:#E6E8E7;padding:32px;border-radius:16px">
        <h2 style="color:#2083B9">A student asked something the AI couldn't answer</h2>
        <p><strong>Student:</strong> ${client.name} (${client.phone})</p>
        <p><strong>Their question:</strong></p>
        <blockquote style="background:#fff;border-left:4px solid #E48328;padding:12px 16px;border-radius:0 12px 12px 0;margin:0">
          ${escalation?.question_text || 'See dashboard for details'}
        </blockquote>
        <p style="margin-top:24px">
          <a href="${getBaseUrl()}/admin/escalations"
             style="background:#B7C733;color:#0A3F3A;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold">
            Answer on dashboard →
          </a>
        </p>
        <p style="margin-top:32px;color:#0A3F3A;font-size:12px">The student has been told their question is flagged and a counselor will respond.</p>
      </div>`
  }

  try {
    if (recipient) {
      await resend.emails.send({
        from: 'AceVisa <noreply@acevisa.co>',
        to: recipient,
        subject,
        html,
      })
    } else {
      console.log(`No recipient email for type ${type} — skipping send, logging only`)
      status = 'skipped'
    }
  } catch (err) {
    console.error('Resend error:', err)
    status = 'failed'
  }

  await supabase.from('messages_log').insert({
    client_id: clientId,
    channel: 'email',
    template_used: type as NotificationType,
    status,
  })

  return NextResponse.json({ success: true, status })
}
