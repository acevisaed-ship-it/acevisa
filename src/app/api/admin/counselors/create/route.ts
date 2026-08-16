import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { sendEmail, counselorWelcomeEmailHtml } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/server'
import { logStaffActivity } from '@/lib/activityLog'
import { NextResponse } from 'next/server'

const CREATABLE_ROLES_BY_ADMIN = ['counselor', 'receptionist'] as const
const CREATABLE_ROLES_BY_CEO = ['counselor', 'receptionist', 'admin'] as const

export async function POST(request: Request) {
  const { admin: requester, error: authError } = await requireAdminApi()
  if (authError) return authError

  const { firstName, lastName, phone, email, password, role, branchId } = await request.json() as {
    firstName?: string
    lastName?: string
    phone?: string
    email?: string
    password?: string
    role?: string
    branchId?: string
  }

  const isCeo = requester.role === 'ceo'
  const requestedRole = role || 'counselor'
  const allowedRoles = isCeo ? CREATABLE_ROLES_BY_CEO : CREATABLE_ROLES_BY_ADMIN

  if (!allowedRoles.includes(requestedRole as never)) {
    return NextResponse.json(
      { error: `You are not allowed to create a "${requestedRole}" account` },
      { status: 403 }
    )
  }

  // Branch Managers can only create staff within their own branch.
  // CEO can target any branch (or none, for another CEO — not exposed via this form).
  const targetBranchId = isCeo ? (branchId || null) : requester.branch_id

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  // Enforce company email domain (legacy @acevisa.co still accepted during transition)
  const emailLower = email.toLowerCase().trim()
  const allowedDomains = ['@aceyourvisa.com', '@acevisa.co']
  if (!allowedDomains.some((d) => emailLower.endsWith(d))) {
    return NextResponse.json(
      { error: 'Staff email must end with @aceyourvisa.com' },
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
    .eq('email', emailLower)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'A counselor with this email already exists' }, { status: 409 })
  }

  // Create Supabase Auth user
  const { data: authUser, error: authError2 } = await supabase.auth.admin.createUser({
    email: emailLower,
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
      email: emailLower,
      phone: phone?.trim() || null,
      role: requestedRole,
      branch_id: targetBranchId,
      status: 'active',
    })
    .select('id, name, email, phone, role, status, created_at')
    .single()

  if (insertError || !counselor) {
    // Roll back auth user if DB insert fails
    await supabase.auth.admin.deleteUser(authUser.user.id)
    console.error('[counselors/create] db error:', insertError)
    return NextResponse.json({ error: 'Failed to create counselor record' }, { status: 500 })
  }

  await sendEmail({
    to: emailLower,
    subject: 'Welcome to ACE Altius Consulting',
    html: counselorWelcomeEmailHtml({
      name: fullName,
      email: emailLower,
      loginUrl: `${new URL(request.url).origin}/login`,
    }),
  })

  await logStaffActivity({
    counselorId: requester.id,
    actorRole: requester.role,
    actionType: 'account_created',
    description: `${requester.name} created a new ${requestedRole} account for ${fullName} (${emailLower})`,
    metadata: { targetId: counselor.id, targetRole: requestedRole },
  })

  return NextResponse.json({ success: true, counselor })
}
