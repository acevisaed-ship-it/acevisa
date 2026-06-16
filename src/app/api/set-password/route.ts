import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { clientId, password } = await request.json() as { clientId?: string; password?: string }

  if (!clientId || !password) {
    return NextResponse.json({ error: 'clientId and password required' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch the client record to get auth_user_id and email
  const { data: client, error: fetchErr } = await supabase
    .from('clients')
    .select('auth_user_id, email')
    .eq('id', clientId)
    .single()

  if (fetchErr || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  let authUserId: string | null = client.auth_user_id ?? null

  if (authUserId) {
    // Auth user already exists (from invite) — just update the password
    const { error } = await supabase.auth.admin.updateUserById(authUserId, { password })
    if (error) {
      console.error('[set-password] updateUserById error:', error)
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 })
    }
  } else if (client.email) {
    // No auth user yet — create one with a confirmed email + password
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: client.email,
      password,
      email_confirm: true,
      user_metadata: { clientId },
    })
    if (error || !created?.user) {
      console.error('[set-password] createUser error:', error)
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }
    authUserId = created.user.id
    await supabase.from('clients').update({ auth_user_id: authUserId }).eq('id', clientId)
  } else {
    return NextResponse.json({ error: 'No email on record — cannot create login' }, { status: 400 })
  }

  // Mark password as set
  await supabase.from('clients').update({ portal_password_set: true }).eq('id', clientId)

  return NextResponse.json({ success: true })
}
