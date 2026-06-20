import { NextResponse } from 'next/server'
import { getAuthenticatedCounselor } from '@/lib/supabase/server'
import { getCounselorEmailConfig } from '@/lib/email/config'

export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await getCounselorEmailConfig()
  if (!config) return NextResponse.json({ error: 'Email not configured' }, { status: 503 })

  const contentType = request.headers.get('content-type') ?? ''
  let to = '', subject = '', html = '', text = '', replyTo = ''
  let attachmentFiles: { filename: string; content: Buffer }[] = []

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    to = (formData.get('to') as string) ?? ''
    subject = (formData.get('subject') as string) ?? ''
    html = (formData.get('html') as string) ?? ''
    text = (formData.get('text') as string) ?? ''
    replyTo = (formData.get('replyTo') as string) ?? ''
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
    subject = body.subject ?? ''
    html = body.html ?? ''
    text = body.text ?? ''
    replyTo = body.replyTo ?? ''
  }

  if (!to || !subject || (!html && !text)) {
    return NextResponse.json({ error: 'to, subject, and body are required' }, { status: 400 })
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
      to,
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
