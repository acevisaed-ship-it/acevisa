import {
  accountSetupEmailHtml,
  passwordResetEmailHtml,
  sendEmail,
} from '@/lib/email'
import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js'

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

function buildConfirmLink(
  origin: string,
  hashedToken: string,
  type: EmailOtpType,
  nextPath: string,
) {
  const url = new URL('/auth/confirm', origin)
  url.searchParams.set('token_hash', hashedToken)
  url.searchParams.set('type', type)
  url.searchParams.set('next', nextPath)
  return url.toString()
}

/**
 * Generate a Supabase auth token and deliver a PKCE-safe confirm link via app SMTP
 * (not Supabase's built-in mailer / action_link verify URL, which breaks under SSR).
 */
export async function sendStudentAuthLinkEmail(
  opts: SendStudentAuthLinkOpts
): Promise<SendStudentAuthLinkResult> {
  const { supabase, email, clientId, name, origin, portalPasswordSet } = opts
  let authUserId = opts.authUserId ?? null

  const nextPath = portalPasswordSet
    ? `/portal/reset-password?clientId=${clientId}`
    : `/portal/setup-password?clientId=${clientId}`

  // redirectTo is still passed to generateLink for Supabase audit/fallback metadata
  const redirectTo = `${origin}${nextPath}`

  let actionLink: string | null = null
  let linkType: EmailOtpType = 'recovery'

  if (!authUserId && !portalPasswordSet) {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo,
        data: { clientId, name },
      },
    })

    const hashed = data?.properties?.hashed_token
    if (!error && hashed) {
      linkType = 'invite'
      actionLink = buildConfirmLink(origin, hashed, 'invite', nextPath)
      authUserId = data.user?.id ?? authUserId
    } else if (error) {
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

    const hashed = data?.properties?.hashed_token
    if (error || !hashed) {
      return {
        sent: false,
        authUserId,
        error: error?.message ?? 'Failed to generate reset link',
      }
    }

    linkType = 'recovery'
    actionLink = buildConfirmLink(origin, hashed, 'recovery', nextPath)
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

  // linkType kept for logging clarity
  console.log('[studentAuthLinks] sent', { email, linkType, nextPath })

  return { sent: true, authUserId }
}
