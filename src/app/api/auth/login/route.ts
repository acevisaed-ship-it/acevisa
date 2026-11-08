import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function homeForRole(role: string | null | undefined): string {
  if (role === 'admin' || role === 'ceo') return '/admin'
  if (role === 'receptionist') return '/receptionist'
  if (role === 'accountant') return '/accountant'
  return '/dashboard'
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string
    password?: string
    rememberMe?: boolean
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const rememberMe = Boolean(body.rememberMe)

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

  if (signInError) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: counselor } = await admin
    .from('counselors')
    .select('id, name, status, role')
    .eq('email', email)
    .maybeSingle()

  if (!counselor) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Account not set up. Contact admin.' }, { status: 403 })
  }

  if (counselor.status !== 'active') {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Your account is inactive. Contact admin.' }, { status: 403 })
  }

  const cookieStore = await cookies()
  cookieStore.set('ace_remember', rememberMe ? '1' : '0', {
    path: '/',
    maxAge: 30 * 24 * 3600,
    sameSite: 'lax',
  })
  if (!rememberMe) {
    cookieStore.set('ace_session_token', crypto.randomUUID(), {
      path: '/',
      sameSite: 'lax',
    })
  } else {
    cookieStore.set('ace_session_token', '', { path: '/', maxAge: 0 })
  }

  return NextResponse.json({
    success: true,
    role: counselor.role,
    home: homeForRole(counselor.role),
  })
}
