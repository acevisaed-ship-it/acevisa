import { NextResponse } from 'next/server'
import { getAuthenticatedCounselor, createAdminClient } from '@/lib/supabase/server'
import { getCounselorEmailConfig } from '@/lib/email/config'

export const runtime = 'nodejs'
export const maxDuration = 60

type AttachmentFile = { filename: string; content: Buffer }

async function parseRequest(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''
  let to = ''
  let cc = ''
  let bcc = ''
  let subject = ''
  let html = ''
  let text = ''
  let replyTo = ''
  let scheduleAt = ''
  let attachmentFiles: AttachmentFile[] = []

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    to = (formData.get('to') as string) ?? ''
    cc = (formData.get('cc') as string) ?? ''
    bcc = (formData.get('bcc') as string) ?? ''
    subject = (formData.get('subject') as string) ?? ''
    html = (formData.get('html') as string) ?? ''
    text = (formData.get('text') as string) ?? ''
    replyTo = (formData.get('replyTo') as string) ?? ''
    scheduleAt = (formData.get('scheduleAt') as string) ?? ''
    const files = formData.getAll('attachments') as File[]
    attachmentFiles = await Promise.all(
      files.map(async (f) => ({
        filename: f.name,
        content: Buffer.from(await f.arrayBuffer()),
      }))
    )
  } else {
    const body = await request.json()
    to = body.to ?? ''
    cc = body.cc ?? ''
    bcc = body.bcc ?? ''
    subject = body.subject ?? ''
    html = body.html ?? ''
    text = body.text ?? ''
    replyTo = body.replyTo ?? ''
    scheduleAt = body.scheduleAt ?? ''
  }

  return { to, cc, bcc, subject, html, text, replyTo, scheduleAt, attachmentFiles }
}

function splitAddresses(value: string) {
  return value
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await getCounselorEmailConfig()
  if (!config) return NextResponse.json({ error: 'Email not configured' }, { status: 503 })

  const { to, cc, bcc, subject, html, text, replyTo, scheduleAt, attachmentFiles } =
    await parseRequest(request)

  if (!to || !subject || (!html && !text)) {
    return NextResponse.json({ error: 'to, subject, and body are required' }, { status: 400 })
  }

  // Schedule for later — attachments not supported in queue yet
  if (scheduleAt) {
    const when = new Date(scheduleAt)
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'scheduleAt must be a future date/time' }, { status: 400 })
    }
    if (attachmentFiles.length) {
      return NextResponse.json(
        { error: 'Attachments are not supported for scheduled emails yet. Send now, or schedule without attachments.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('scheduled_emails').insert({
      counselor_id: counselor.id,
      from_address: config.from,
      to_addresses: to,
      cc_addresses: cc || null,
      bcc_addresses: bcc || null,
      subject,
      body_text: text || null,
      body_html: html || null,
      reply_to_uid: replyTo || null,
      send_at: when.toISOString(),
      status: 'pending',
    })

    if (error) {
      console.error('Schedule email error:', error)
      return NextResponse.json(
        { error: 'Failed to schedule email. Has the scheduled_emails migration been applied?' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, scheduled: true, sendAt: when.toISOString() })
  }

  try {
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: true,
      auth: { user: config.user, pass: config.password },
    })

    await transporter.sendMail({
      from: config.from,
      to: splitAddresses(to),
      cc: cc ? splitAddresses(cc) : undefined,
      bcc: bcc ? splitAddresses(bcc) : undefined,
      subject,
      html: html || undefined,
      text: text || undefined,
      inReplyTo: replyTo || undefined,
      references: replyTo || undefined,
      attachments: attachmentFiles.length ? attachmentFiles : undefined,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('SMTP send error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
