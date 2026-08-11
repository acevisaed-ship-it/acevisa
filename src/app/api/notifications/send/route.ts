import { createAdminClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/utils'
import {
  sendEmail,
  meetingConfirmationEmailHtml,
  meetingReminder24hEmailHtml,
  meetingReminder2hEmailHtml,
  escalationEmailHtml,
} from '@/lib/email'
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

  const { data: client } = await supabase
    .from('clients')
    .select('name, phone, email')
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  let subject = ''
  let html = ''
  let recipient: string | null = client.email
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
    const counselor = Array.isArray(counselorData) ? counselorData[0] : counselorData
    const counselorName = counselor?.name || 'Your Counselor'

    if (type === 'meeting_confirmation') {
      subject = 'Your meeting is confirmed — ACE Altius'
      html = meetingConfirmationEmailHtml({
        clientName: client.name,
        counselorName,
        whenPKT: timeLabel,
      })
    }

    if (type === 'meeting_reminder_24h') {
      subject = 'Reminder: Your ACE Altius meeting is tomorrow'
      html = meetingReminder24hEmailHtml({
        clientName: client.name,
        counselorName,
        whenPKT: timeLabel,
      })
    }

    if (type === 'meeting_reminder_2h') {
      subject = 'Your meeting starts in 2 hours — ACE Altius'
      html = meetingReminder2hEmailHtml({
        clientName: client.name,
        counselorName,
        whenPKT: timeLabel,
      })
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
    subject = 'Student question needs your input — ACE Altius'
    html = escalationEmailHtml({
      counselorName: counselor.name,
      clientName: `${client.name} (${client.phone})`,
      question: escalation?.question_text || 'See dashboard for details',
      dashboardUrl: `${getBaseUrl()}/admin/escalations`,
    })
  }

  try {
    if (recipient) {
      await sendEmail({ to: recipient, subject, html })
      if (!process.env.SES_SMTP_USER || !process.env.SES_SMTP_PASSWORD) {
        status = 'skipped'
      }
    } else {
      console.log(`No recipient email for type ${type} — skipping send, logging only`)
      status = 'skipped'
    }
  } catch (err) {
    console.error('[notifications/send] error:', err)
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
