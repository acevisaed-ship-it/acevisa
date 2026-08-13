import { studentLoginAuthEmail } from '@/lib/auth/studentAuthEmail'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { identifier, password } = await request.json() as {
    identifier?: string // email or phone
    password?: string
  }

  if (!identifier?.trim() || !password) {
    return NextResponse.json({ error: 'Email/phone and password are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const id = identifier.trim().toLowerCase()

  // Determine if identifier is email or phone; look up client
  const isEmail = id.includes('@')
  const query = isEmail
    ? supabase.from('clients').select('id, email, portal_password_set, status').eq('email', id).maybeSingle()
    : supabase.from('clients').select('id, email, portal_password_set, status').eq('phone', identifier.trim()).maybeSingle()

  const { data: client } = await query

  if (!client) {
    return NextResponse.json(
      { error: 'No account found with that email or phone number.' },
      { status: 404 }
    )
  }

  if ((client as Record<string, unknown>).status === 'suspended') {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
  }

  if (!client.portal_password_set) {
    return NextResponse.json(
      { error: 'Your portal account has not been set up yet. Please check your email for a setup link, or use "Forgot password" to request a new one.' },
      { status: 403 }
    )
  }

  const authEmail = studentLoginAuthEmail({ email: client.email, clientId: client.id })

  // Authenticate with Supabase Auth using auth email + password
  const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  })

  if (signInError || !session?.session) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    clientId: client.id,
    accessToken: session.session.access_token,
    refreshToken: session.session.refresh_token,
  })
}
