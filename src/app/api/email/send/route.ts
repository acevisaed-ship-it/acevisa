import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { getEmailConfig } from '@/lib/email/config'

export async function POST(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const config = getEmailConfig()
  if (!config) return NextResponse.json({ error: 'Email not configured' }, { status: 503 })

  const body = await request.json()
  const { to, subject, html, text, replyTo } = body as {
    to: string
    subject: string
    html?: string
    text?: string
    replyTo?: string
  }

  if (!to || !subject || (!html && !text)) {
    return NextResponse.json({ error: 'to, subject, and body are required' }, { status: 400 })
  }

  try {
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport({
      host: config.host,
      port: 465,
      secure: true,
      auth: { user: config.user, pass: config.password },
    })

    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html: html ?? undefined,
      text: text ?? undefined,
      inReplyTo: replyTo ?? undefined,
      references: replyTo ?? undefined,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('SMTP send error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
