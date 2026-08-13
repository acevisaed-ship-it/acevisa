import { sendStudentAuthLinkEmail } from '@/lib/email/studentAuthLinks'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const GENERIC_OK = {
  success: true,
  message: 'If an account exists with that email or phone, a reset link has been sent.',
}

export async function POST(request: Request) {
  const { identifier } = (await request.json()) as { identifier?: string }

  if (!identifier?.trim()) {
    return NextResponse.json({ error: 'Email or phone required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const id = identifier.trim().toLowerCase()
  const isEmail = id.includes('@')

  const query = isEmail
    ? supabase
        .from('clients')
        .select('id, email, name, portal_password_set, auth_user_id')
        .eq('email', id)
        .maybeSingle()
    : supabase
        .from('clients')
        .select('id, email, name, portal_password_set, auth_user_id')
        .eq('phone', identifier.trim())
        .maybeSingle()

  const { data: client } = await query

  // No contact email → cannot send a reset link (phone-only accounts).
  // Still return the same message to prevent email/phone enumeration.
  if (!client?.email) {
    return NextResponse.json(GENERIC_OK)
  }

  const origin = (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
    new URL(request.url).origin
  )
  const result = await sendStudentAuthLinkEmail({
    supabase,
    email: client.email,
    clientId: client.id,
    name: client.name ?? 'there',
    origin,
    portalPasswordSet: !!client.portal_password_set,
    authUserId: client.auth_user_id,
  })

  if (!result.sent) {
    console.error('[forgot-password] failed to send auth link:', result.error)
  }

  return NextResponse.json(GENERIC_OK)
}
