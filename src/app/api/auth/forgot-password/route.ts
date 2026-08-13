import { passwordResetEmailHtml, sendEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Staff (counselor / admin / CEO) password reset.
 * Uses generateLink + app SMTP with a PKCE-safe /auth/confirm link —
 * same pattern as student forgot-password (resetPasswordForEmail alone
 * relies on Supabase mailer templates that break under SSR).
 */
export async function POST(request: Request) {
  const { email } = (await request.json()) as { email?: string }

  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const normalized = email.trim().toLowerCase()
  const supabase = createAdminClient()

  const { data: counselor } = await supabase
    .from('counselors')
    .select('id, name, email, status')
    .eq('email', normalized)
    .maybeSingle()

  // Always return the same message to avoid account enumeration
  const ok = {
    success: true,
    message: 'If an account exists with that email, a reset link has been sent.',
  }

  if (!counselor || counselor.status !== 'active') {
    return NextResponse.json(ok)
  }

  const origin = (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
    new URL(request.url).origin
  )
  const nextPath = '/reset-password'
  const redirectTo = `${origin}${nextPath}`

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: counselor.email,
    options: { redirectTo },
  })

  const hashed = data?.properties?.hashed_token
  if (error || !hashed) {
    console.error('[auth/forgot-password] generateLink failed:', error?.message)
    return NextResponse.json(ok)
  }

  const confirmUrl = new URL('/auth/confirm', origin)
  confirmUrl.searchParams.set('token_hash', hashed)
  confirmUrl.searchParams.set('type', 'recovery')
  confirmUrl.searchParams.set('next', nextPath)

  const sent = await sendEmail({
    to: counselor.email,
    subject: 'Reset your ACE Altius password',
    html: passwordResetEmailHtml({
      name: counselor.name || 'there',
      resetUrl: confirmUrl.toString(),
    }),
  })

  if (!sent) {
    console.error('[auth/forgot-password] SMTP send failed for', counselor.email)
  }

  return NextResponse.json(ok)
}
