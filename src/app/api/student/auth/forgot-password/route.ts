import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { identifier } = await request.json() as { identifier?: string }

  if (!identifier?.trim()) {
    return NextResponse.json({ error: 'Email or phone required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const id = identifier.trim().toLowerCase()
  const isEmail = id.includes('@')

  const query = isEmail
    ? supabase.from('clients').select('id, email, portal_password_set').eq('email', id).maybeSingle()
    : supabase.from('clients').select('id, email, portal_password_set').eq('phone', identifier.trim()).maybeSingle()

  const { data: client } = await query

  // Always return the same message to prevent email/phone enumeration
  if (!client || !client.email) {
    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email or phone, a reset link has been sent.',
    })
  }

  if (!client.portal_password_set) {
    // Account never set up — re-send the setup invite
    const origin = new URL(request.url).origin
    await supabase.auth.admin.inviteUserByEmail(client.email, {
      redirectTo: `${origin}/portal/setup-password?clientId=${client.id}`,
    })
    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email or phone, a reset link has been sent.',
    })
  }

  // Account set up — send standard Supabase password reset
  const origin = new URL(request.url).origin
  await supabase.auth.resetPasswordForEmail(client.email, {
    redirectTo: `${origin}/portal/reset-password?clientId=${client.id}`,
  })

  return NextResponse.json({
    success: true,
    message: 'If an account exists with that email or phone, a reset link has been sent.',
  })
}
