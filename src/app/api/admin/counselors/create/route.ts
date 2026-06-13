import { createAdminClient, requireAdminApi } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi()
  if (authError) return authError

  const { firstName, lastName, phone, email, password } = await request.json() as {
    firstName?: string
    lastName?: string
    phone?: string
    email?: string
    password?: string
  }

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  // Enforce @acevisa.co email domain
  if (!email.toLowerCase().endsWith('@acevisa.co')) {
    return NextResponse.json(
      { error: 'Counselor email must end with @acevisa.co' },
      { status: 422 }
    )
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 422 }
    )
  }

  const supabase = createAdminClient()

  // Check for duplicate email in counselors table
  const { data: existing } = await supabase
    .from('counselors')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'A counselor with this email already exists' }, { status: 409 })
  }

  // Create Supabase Auth user
  const { data: authUser, error: authError2 } = await supabase.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true, // auto-confirm so they can log in immediately
  })

  if (authError2 || !authUser.user) {
    console.error('[counselors/create] auth error:', authError2)
    return NextResponse.json(
      { error: authError2?.message ?? 'Failed to create auth account' },
      { status: 500 }
    )
  }

  const fullName = `${firstName.trim()} ${lastName.trim()}`

  // Insert into counselors table
  const { data: counselor, error: insertError } = await supabase
    .from('counselors')
    .insert({
      name: fullName,
      email: email.toLowerCase(),
      phone: phone?.trim() || null,
      role: 'counselor',
      status: 'active',
    })
    .select('id, name, email, phone, status, created_at')
    .single()

  if (insertError || !counselor) {
    // Roll back auth user if DB insert fails
    await supabase.auth.admin.deleteUser(authUser.user.id)
    console.error('[counselors/create] db error:', insertError)
    return NextResponse.json({ error: 'Failed to create counselor record' }, { status: 500 })
  }

  // Send account confirmation email via Supabase (magic link for first login)
  await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email.toLowerCase(),
    options: { redirectTo: `${new URL(request.url).origin}/login` },
  })

  return NextResponse.json({ success: true, counselor })
}
