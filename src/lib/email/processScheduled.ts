import { createAdminClient } from '@/lib/supabase/server'
import type { EmailConfig } from '@/lib/email/config'

function splitAddresses(value: string) {
  return value
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function resolveConfigForCounselor(counselorId: string): Promise<EmailConfig | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('counselor_email_accounts')
    .select('email_address, display_name, imap_host, imap_port, smtp_host, smtp_port, app_password')
    .eq('counselor_id', counselorId)
    .eq('is_active', true)
    .maybeSingle()

  if (data) {
    return {
      host: data.imap_host,
      port: data.imap_port,
      smtpHost: data.smtp_host,
      smtpPort: data.smtp_port,
      user: data.email_address,
      password: data.app_password,
      from: data.display_name
        ? `${data.display_name} <${data.email_address}>`
        : data.email_address,
    }
  }

  const host = process.env.EMAIL_HOST
  const user = process.env.EMAIL_USER
  const password = process.env.EMAIL_PASSWORD
  if (!host || !user || !password) return null

  return {
    host,
    port: Number(process.env.EMAIL_PORT ?? 993),
    smtpHost: process.env.EMAIL_SMTP_HOST ?? host,
    smtpPort: Number(process.env.EMAIL_SMTP_PORT ?? 465),
    user,
    password,
    from: process.env.EMAIL_FROM ?? user,
  }
}

/** Send any due scheduled emails (optionally scoped to one counselor). */
export async function processDueScheduledEmails(counselorId?: string) {
  const supabase = createAdminClient()
  let query = supabase
    .from('scheduled_emails')
    .select('*')
    .eq('status', 'pending')
    .lte('send_at', new Date().toISOString())
    .order('send_at', { ascending: true })
    .limit(20)

  if (counselorId) query = query.eq('counselor_id', counselorId)

  const { data: rows, error } = await query
  // Table may not exist until migration is applied — treat as no-op
  if (error) {
    if (/scheduled_emails|does not exist|schema cache/i.test(error.message)) {
      return { sent: 0, failed: 0 }
    }
    return { sent: 0, failed: 0, error: error.message }
  }
  if (!rows?.length) return { sent: 0, failed: 0 }

  let sent = 0
  let failed = 0
  const nodemailer = await import('nodemailer')

  for (const row of rows) {
    try {
      const config = await resolveConfigForCounselor(row.counselor_id)
      if (!config) throw new Error('Email not configured for sender')

      const transporter = nodemailer.default.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: true,
        auth: { user: config.user, pass: config.password },
      })

      await transporter.sendMail({
        from: row.from_address || config.from,
        to: splitAddresses(row.to_addresses),
        cc: row.cc_addresses ? splitAddresses(row.cc_addresses) : undefined,
        bcc: row.bcc_addresses ? splitAddresses(row.bcc_addresses) : undefined,
        subject: row.subject,
        html: row.body_html || undefined,
        text: row.body_text || undefined,
        inReplyTo: row.reply_to_uid || undefined,
        references: row.reply_to_uid || undefined,
      })

      await supabase
        .from('scheduled_emails')
        .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
        .eq('id', row.id)
      sent++
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Send failed'
      await supabase
        .from('scheduled_emails')
        .update({ status: 'failed', error_message: message })
        .eq('id', row.id)
      failed++
    }
  }

  return { sent, failed }
}
