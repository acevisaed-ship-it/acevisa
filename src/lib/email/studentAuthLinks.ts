import {
  accountSetupEmailHtml,
  passwordResetEmailHtml,
  sendEmail,
} from '@/lib/email'
import type { SupabaseClient } from '@supabase/supabase-js'

type SendStudentAuthLinkOpts = {
  supabase: SupabaseClient
  email: string
  clientId: string
  name: string
  origin: string
  /** true = password reset; false = first-time portal setup */
  portalPasswordSet: boolean
  authUserId?: string | null
}

export type SendStudentAuthLinkResult = {
  sent: boolean
  authUserId: string | null
  error?: string
}

/**
 * Generate a Supabase auth action link and deliver it immediately via app SMTP
 * (not Supabase's built-in mailer, which often isn't configured / is delayed).
 */
export async function sendStudentAuthLinkEmail(
  opts: SendStudentAuthLinkOpts
): Promise<SendStudentAuthLinkResult> {
  const { supabase, email, clientId, name, origin, portalPasswordSet } = opts
  let authUserId = opts.authUserId ?? null

  const redirectTo = portalPasswordSet
    ? `${origin}/portal/reset-password?clientId=${clientId}`
    : `${origin}/portal/setup-password?clientId=${clientId}`

  let actionLink: string | null = null

  if (!authUserId && !portalPasswordSet) {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo,
        data: { clientId, name },
      },
    })

    if (!error && data?.properties?.action_link) {
      actionLink = data.properties.action_link
      authUserId = data.user?.id ?? authUserId
    } else if (error) {
      // User may already exist — fall through to recovery below
      console.warn('[studentAuthLinks] invite generateLink failed, trying recovery:', error.message)
    }
  }

  if (!actionLink) {
    if (!authUserId) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { clientId, name },
      })
      if (createErr || !created?.user) {
        // Already exists is fine — continue to recovery
        if (createErr && !/already|registered|exists/i.test(createErr.message)) {
          return {
            sent: false,
            authUserId: null,
            error: createErr?.message ?? 'Failed to create auth user',
          }
        }
      } else {
        authUserId = created.user.id
      }
    }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    if (error || !data?.properties?.action_link) {
      return {
        sent: false,
        authUserId,
        error: error?.message ?? 'Failed to generate reset link',
      }
    }

    actionLink = data.properties.action_link
    authUserId = data.user?.id ?? authUserId
  }

  if (authUserId) {
    await supabase
      .from('clients')
      .update({ auth_user_id: authUserId })
      .eq('id', clientId)
  }

  const subject = portalPasswordSet
    ? 'Reset your ACE Altius portal password'
    : 'Set up your ACE Altius portal account'

  const html = portalPasswordSet
    ? passwordResetEmailHtml({ name: name || 'there', resetUrl: actionLink })
    : accountSetupEmailHtml({ name: name || 'there', setupUrl: actionLink })

  const sent = await sendEmail({ to: email, subject, html })
  if (!sent) {
    return {
      sent: false,
      authUserId,
      error: 'SMTP send failed or credentials not configured',
    }
  }

  return { sent: true, authUserId }
}
