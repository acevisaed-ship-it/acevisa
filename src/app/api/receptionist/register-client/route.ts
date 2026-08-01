import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, studentWelcomeEmailHtml } from '@/lib/email'
import { logStaffActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { NextResponse } from 'next/server'

function generateTempPassword() {
  // Readable but not-guessable: 3 letters + 4 digits + 2 letters, e.g. "kxp4821qm"
  const letters = 'abcdefghjkmnpqrstuvwxyz' // no i/l/o — avoid visual ambiguity
  const digits = '23456789' // no 0/1 — avoid visual ambiguity
  const pick = (chars: string, n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${pick(letters, 3)}${pick(digits, 4)}${pick(letters, 2)}`
}

export async function POST(request: Request) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError

  const body = await request.json() as {
    name?: string
    phone?: string
    email?: string
    city?: string
    language?: string
    interested_in?: string
    target_country?: string
    counselorId?: string
  }

  const { name, phone, email, city, language, interested_in, target_country, counselorId } = body

  if (!name?.trim() || !phone?.trim() || !email?.trim() || !language?.trim()) {
    return NextResponse.json(
      { error: 'Name, phone, email, and language are required' },
      { status: 400 }
    )
  }

  const emailLower = email.trim().toLowerCase()
  const supabase = createAdminClient()

  // Duplicate checks — same rules as the public /api/register flow
  const { data: existingByPhone } = await supabase
    .from('clients')
    .select('id, client_code')
    .eq('phone', phone.trim())
    .maybeSingle()

  if (existingByPhone) {
    return NextResponse.json(
      { error: `A client with this phone already exists (${existingByPhone.client_code}).` },
      { status: 409 }
    )
  }

  const { data: existingByEmail } = await supabase
    .from('clients')
    .select('id, client_code')
    .eq('email', emailLower)
    .maybeSingle()

  if (existingByEmail) {
    return NextResponse.json(
      { error: `A client with this email already exists (${existingByEmail.client_code}).` },
      { status: 409 }
    )
  }

  let referredCounselor: { id: string; name: string } | null = null
  if (counselorId) {
    const { data: counselorRow } = await supabase
      .from('counselors')
      .select('id, name, role, status, branch_id')
      .eq('id', counselorId)
      .maybeSingle()

    if (
      !counselorRow ||
      counselorRow.role !== 'counselor' ||
      counselorRow.status !== 'active' ||
      counselorRow.branch_id !== receptionist.branch_id
    ) {
      return NextResponse.json({ error: 'Invalid counselor selection' }, { status: 400 })
    }
    referredCounselor = { id: counselorRow.id, name: counselorRow.name }
  }

  const tempPassword = generateTempPassword()

  // Create the Supabase Auth user with the preset password directly (no magic-link
  // setup step — receptionist-registered students can log in immediately).
  const { data: authUser, error: authUserError } = await supabase.auth.admin.createUser({
    email: emailLower,
    password: tempPassword,
    email_confirm: true,
  })

  if (authUserError || !authUser.user) {
    console.error('[receptionist/register-client] auth error:', authUserError)
    return NextResponse.json(
      { error: authUserError?.message ?? 'Failed to create login account' },
      { status: 500 }
    )
  }

  const { data: newClient, error: insertError } = await supabase
    .from('clients')
    .insert({
      name: name.trim(),
      phone: phone.trim(),
      email: emailLower,
      city: city?.trim() || null,
      language: language.toLowerCase(),
      interested_in: interested_in?.trim() || null,
      target_country: target_country?.trim() || null,
      ad_source: 'receptionist',
      branch_id: receptionist.branch_id,
      registered_by: receptionist.id,
      counselor_id: referredCounselor?.id ?? null,
      pipeline_stage: 1,
      qualification_score: 0,
      auth_user_id: authUser.user.id,
      portal_password_set: true, // preset password is already a real, working password
    })
    .select('id, client_code, name')
    .single()

  if (insertError || !newClient) {
    // Roll back the auth user if the DB insert fails
    await supabase.auth.admin.deleteUser(authUser.user.id)
    console.error('[receptionist/register-client] db error:', insertError)
    return NextResponse.json({ error: 'Failed to create client record' }, { status: 500 })
  }

  const origin = new URL(request.url).origin
  await sendEmail({
    to: emailLower,
    subject: `Welcome to ACE Altius — your ID is ${newClient.client_code}`,
    html: studentWelcomeEmailHtml({
      studentName: newClient.name,
      clientCode: newClient.client_code,
      loginEmail: emailLower,
      tempPassword,
      portalUrl: `${origin}/portal?clientId=${newClient.id}`,
    }),
  })

  if (referredCounselor) {
    await createNotification({
      counselorId: referredCounselor.id,
      type: 'chat_message',
      title: `New client assigned — ${newClient.name}`,
      body: `Registered and referred to you directly by reception.`,
      clientId: newClient.id,
    })
  }

  await logStaffActivity({
    counselorId: receptionist.id,
    actorRole: 'receptionist',
    actionType: 'client_registered',
    description: `Receptionist ${receptionist.name} registered new client ${newClient.name} (${newClient.client_code})${
      referredCounselor ? ` and referred them to ${referredCounselor.name}` : ''
    }`,
    metadata: {
      clientId: newClient.id,
      clientCode: newClient.client_code,
      referredCounselorId: referredCounselor?.id ?? null,
    },
  })

  return NextResponse.json({
    success: true,
    clientId: newClient.id,
    clientCode: newClient.client_code,
    referredCounselorName: referredCounselor?.name ?? null,
  })
}
