import { sendEmail, passwordChangedEmailHtml } from '@/lib/email'
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
    .select('auth_user_id, email, name')
    .eq('id', clientId)
    .single()

  if (fetchErr || !client) {
    const msg = fetchErr
      ? `${fetchErr.message} (${fetchErr.code})`
      : 'Client not found'
    return NextResponse.json({ error: msg }, { status: fetchErr ? 500 : 404 })
  }

  let authUserId: string | null = client.auth_user_id ?? null

  if (authUserId) {
    // Auth user already exists (from invite) — just update the password
    const { error } = await supabase.auth.admin.updateUserById(authUserId, { password })
    if (error) {
      console.error('[set-password] updateUserById error:', error)
      return NextResponse.json(
        { error: `Failed to set password: ${error.message} (${error.code})` },
        { status: 500 }
      )
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
      const msg = error
        ? `${error.message} (${error.code})`
        : 'No user returned from createUser'
      return NextResponse.json({ error: `Failed to create account: ${msg}` }, { status: 500 })
    }
    authUserId = created.user.id
    const { error: linkErr } = await supabase
      .from('clients')
      .update({ auth_user_id: authUserId })
      .eq('id', clientId)
    if (linkErr) {
      console.error('[set-password] auth_user_id link error:', linkErr)
      return NextResponse.json(
        { error: `Failed to link account: ${linkErr.message} (${linkErr.code})` },
        { status: 500 }
      )
    }
  } else {
    return NextResponse.json({ error: 'No email on record — cannot create login' }, { status: 400 })
  }

  const { error: pwFlagErr } = await supabase
    .from('clients')
    .update({ portal_password_set: true })
    .eq('id', clientId)

  if (pwFlagErr) {
    console.error('[set-password] portal_password_set update error:', pwFlagErr)
    return NextResponse.json(
      { error: `Password set but failed to update record: ${pwFlagErr.message} (${pwFlagErr.code})` },
      { status: 500 }
    )
  }

  if (client.email) {
    await sendEmail({
      to: client.email,
      subject: 'Your password was changed',
      html: passwordChangedEmailHtml({
        name: client.name ?? 'there',
        whenPKT: new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }),
      }),
    })
  }

  return NextResponse.json({ success: true })
}
