import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { loadClientForm } from '@/lib/receptionist/clientForm'
import { createAdminClient } from '@/lib/supabase/server'
import { studentContactEmail, studentLoginAuthEmail } from '@/lib/auth/studentAuthEmail'
import { sendEmail, studentWelcomeEmailHtml } from '@/lib/email'
import { logStaffActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { generateTempPassword } from '@/lib/auth/generateTempPassword'
import { parseAndValidateWalkInIntake } from '@/lib/receptionist/walkInIntake'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

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
    language_test_interest?: string
    counselorId?: string
    age?: unknown
    lastEducation?: unknown
    educationPercentage?: unknown
    educationCompletionYear?: unknown
    travelHistory?: unknown
    visaRejectionHistory?: unknown
    languageTestScores?: unknown
    budget?: unknown
  }

  const { name, phone, email, city, language, interested_in, target_country, language_test_interest, counselorId } = body

  if (!name?.trim() || !phone?.trim() || !language?.trim() || !city?.trim()) {
    return NextResponse.json(
      { error: 'Name, phone, language, and city are required' },
      { status: 400 }
    )
  }

  const intakeResult = parseAndValidateWalkInIntake({
    interestedIn: interested_in?.trim() || '',
    age: body.age,
    lastEducation: body.lastEducation,
    educationPercentage: body.educationPercentage,
    educationCompletionYear: body.educationCompletionYear,
    travelHistory: body.travelHistory,
    visaRejectionHistory: body.visaRejectionHistory,
    languageTestScores: body.languageTestScores,
    budget: body.budget,
  })

  if (!intakeResult.ok) {
    return NextResponse.json({ error: intakeResult.error }, { status: 400 })
  }

  const contactEmail = studentContactEmail(email)
  const supabase = createAdminClient()

  // Duplicate checks — same rules as the public /api/register flow
  const { data: existingByPhone } = await supabase
    .from('clients')
    .select('id, client_code')
    .eq('phone', phone.trim())
    .maybeSingle()

  if (existingByPhone) {
    const duplicateClient = await loadClientForm(supabase, { clientId: existingByPhone.id })
    return NextResponse.json(
      {
        error: `A client with this phone already exists (${existingByPhone.client_code}).`,
        duplicateClient,
      },
      { status: 409 }
    )
  }

  if (contactEmail) {
    const { data: existingByEmail } = await supabase
      .from('clients')
      .select('id, client_code')
      .eq('email', contactEmail)
      .maybeSingle()

    if (existingByEmail) {
      const duplicateClient = await loadClientForm(supabase, { clientId: existingByEmail.id })
      return NextResponse.json(
        {
          error: `A client with this email already exists (${existingByEmail.client_code}).`,
          duplicateClient,
        },
        { status: 409 }
      )
    }
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
  // Pre-generate id so we can create a synthetic auth email when contact email is omitted
  const clientId = randomUUID()
  const authEmail = studentLoginAuthEmail({ email: contactEmail, clientId })

  // Create the Supabase Auth user with the preset password directly (no magic-link
  // setup step — receptionist-registered students can log in immediately).
  const { data: authUser, error: authUserError } = await supabase.auth.admin.createUser({
    email: authEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { clientId },
  })

  if (authUserError || !authUser.user) {
    console.error('[receptionist/register-client] auth error:', authUserError)
    const raw = authUserError?.message ?? 'Failed to create login account'
    const isAuthz = /not allowed|forbidden|unauthorized|not_admin|service role/i.test(raw)
    return NextResponse.json(
      {
        error: isAuthz
          ? 'Could not create the student login account. Please try again, or sign out and sign back in.'
          : raw,
      },
      { status: 500 }
    )
  }

  const { data: newClient, error: insertError } = await supabase
    .from('clients')
    .insert({
      id: clientId,
      name: name.trim(),
      phone: phone.trim(),
      email: contactEmail,
      city: city?.trim() || null,
      language: language.toLowerCase(),
      interested_in: interested_in?.trim() || null,
      target_country: target_country?.trim() || null,
      language_test_interest: language_test_interest?.trim() || null,
      age: intakeResult.data.age,
      last_education: intakeResult.data.lastEducation,
      education_percentage: intakeResult.data.educationPercentage,
      education_completion_year: intakeResult.data.educationCompletionYear,
      travel_history: intakeResult.data.travelHistory,
      visa_rejection_history: intakeResult.data.visaRejectionHistory,
      language_test_scores: intakeResult.data.languageTestScores,
      budget: intakeResult.data.budget,
      ad_source: 'receptionist',
      branch_id: receptionist.branch_id,
      registered_by: receptionist.id,
      counselor_id: referredCounselor?.id ?? null,
      pipeline_stage: 1,
      qualification_score: 0,
      auth_user_id: authUser.user.id,
      portal_password_set: true, // preset password is already a real, working password
    })
    .select('id, client_code, name, phone')
    .single()

  if (insertError || !newClient) {
    // Roll back the auth user if the DB insert fails
    await supabase.auth.admin.deleteUser(authUser.user.id)
    console.error('[receptionist/register-client] db error:', insertError)
    return NextResponse.json({ error: 'Failed to create client record' }, { status: 500 })
  }

  const origin = new URL(request.url).origin
  if (contactEmail) {
    await sendEmail({
      to: contactEmail,
      subject: `Welcome to ACE Altius — your ID is ${newClient.client_code}`,
      html: studentWelcomeEmailHtml({
        studentName: newClient.name,
        clientCode: newClient.client_code,
        loginEmail: contactEmail,
        tempPassword,
        portalUrl: `${origin}/portal?clientId=${newClient.id}`,
      }),
    })
  }

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
      emailProvided: !!contactEmail,
    },
  })

  return NextResponse.json({
    success: true,
    clientId: newClient.id,
    clientCode: newClient.client_code,
    referredCounselorName: referredCounselor?.name ?? null,
    // When no email was provided, return credentials so reception can share them verbally
    ...(contactEmail
      ? { emailSent: true }
      : {
          emailSent: false,
          loginPhone: newClient.phone,
          tempPassword,
        }),
  })
}
