import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'

export type EmailConfig = {
  host: string
  port: number
  smtpHost: string
  smtpPort: number
  user: string
  password: string
  from: string
}

/** Resolve email config for the currently authenticated counselor from the DB.
 *  Falls back to env vars (legacy / admin shared mailbox) if no DB record found. */
export async function getCounselorEmailConfig(): Promise<EmailConfig | null> {
  try {
    const counselor = await getAuthenticatedCounselor()
    if (counselor) {
      const supabase = createAdminClient()
      const { data } = await supabase
        .from('counselor_email_accounts')
        .select('email_address, display_name, imap_host, imap_port, smtp_host, smtp_port, app_password')
        .eq('counselor_id', counselor.id)
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
    }
  } catch {
    // Fall through to env var fallback
  }

  // Legacy env var fallback (shared mailbox or admin)
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

/** @deprecated Use getCounselorEmailConfig() */
export function getEmailConfig() {
  const host = process.env.EMAIL_HOST
  const user = process.env.EMAIL_USER
  const password = process.env.EMAIL_PASSWORD
  if (!host || !user || !password) return null
  return {
    host,
    port: Number(process.env.EMAIL_PORT ?? 993),
    user,
    password,
    from: process.env.EMAIL_FROM ?? user,
  }
}
