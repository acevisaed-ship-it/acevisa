import { sendStudentAuthLinkEmail } from '@/lib/email/studentAuthLinks'
import { studentContactEmail } from '@/lib/auth/studentAuthEmail'
import { createNotification } from '@/lib/notifications'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { name, phone, email, city, language, interested_in, target_country, ad_source } = body

  if (!name || !phone || !language) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const adSource = ad_source || 'direct'
  const emailLower = studentContactEmail(email)

  // Return existing client if phone already registered
  const { data: existingByPhone } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()

  if (existingByPhone) {
    return NextResponse.json({ success: true, clientId: existingByPhone.id, existing: true })
  }

  // Also check duplicate email
  if (emailLower) {
    const { data: existingByEmail } = await supabase
      .from('clients')
      .select('id')
      .eq('email', emailLower)
      .maybeSingle()

    if (existingByEmail) {
      return NextResponse.json({ success: true, clientId: existingByEmail.id, existing: true })
    }
  }

  let assignedCounselorId: string | null = null

  if (adSource && adSource !== 'direct') {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('default_counselor_id')
      .eq('ad_source_code', adSource)
      .eq('is_active', true)
      .maybeSingle()

    if (campaign?.default_counselor_id) {
      assignedCounselorId = campaign.default_counselor_id
    }
  }

  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({
      name,
      phone,
      email: emailLower,
      city: city || null,
      language: String(language).toLowerCase(),
      interested_in: interested_in || null,
      target_country: target_country || null,
      ad_source: adSource,
      counselor_id: assignedCounselorId,
      pipeline_stage: 1,
      qualification_score: 0,
      portal_password_set: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: `Registration failed: ${error.message} (${error.code})` }, { status: 500 })
  }

  // Create auth user + send setup link immediately via app SMTP (not Supabase mailer)
  if (emailLower) {
    try {
      const origin = new URL(request.url).origin
      const result = await sendStudentAuthLinkEmail({
        supabase,
        email: emailLower,
        clientId: newClient.id,
        name,
        origin,
        portalPasswordSet: false,
        authUserId: null,
      })
      if (!result.sent) {
        console.error('[register] setup email failed (non-fatal):', result.error)
      }
    } catch (inviteEx) {
      console.error('[register] setup email failed (non-fatal):', inviteEx)
    }
  }

  if (!assignedCounselorId) {
    const { data: admins } = await supabase
      .from('counselors')
      .select('id')
      .eq('role', 'admin')

    for (const admin of admins || []) {
      await createNotification({
        counselorId: admin.id,
        type: 'chat_message',
        title: `New unassigned registration — ${name}`,
        body: `From: ${adSource}. Assign to a counselor.`,
        clientId: newClient.id,
      })
    }
  }

  return NextResponse.json({ success: true, clientId: newClient.id })
}
