import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { identifier, password } = await request.json() as {
    identifier?: string
    password?: string
  }

  if (!identifier?.trim() || !password) {
    return NextResponse.json({ error: 'Email/phone and password are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const id = identifier.trim().toLowerCase()
  const isEmail = id.includes('@')

  const query = isEmail
    ? supabase.from('clients').select('id, email, portal_password_set').eq('email', id).maybeSingle()
    : supabase.from('clients').select('id, email, portal_password_set').eq('phone', identifier.trim()).maybeSingle()

  const { data: client } = await query

  if (!client || !client.email) {
    return NextResponse.json(
      { error: 'No account found with that email or phone number.' },
      { status: 404 }
    )
  }

  if (!client.portal_password_set) {
    return NextResponse.json(
      { error: 'Your account password has not been set yet. Use "Forgot password" to set one.' },
      { status: 403 }
    )
  }

  // Authenticate with Supabase Auth
  const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
    email: client.email,
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
