import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, passwordChangedEmailHtml } from '@/lib/email'
import { logStaffActivity } from '@/lib/activityLog'
import { generateTempPassword } from '@/lib/auth/generateTempPassword'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ counselorId: string }> }
) {
  const { admin, error: authError } = await requireAdminApi()
  if (authError) return authError

  const { counselorId } = await params
  const { password: providedPassword } = (await request.json().catch(() => ({}))) as {
    password?: string
  }

  const supabase = createAdminClient()

  const { data: target } = await supabase
    .from('counselors')
    .select('id, name, email, role, branch_id')
    .eq('id', counselorId)
    .single()

  if (!target) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  if (!['counselor', 'receptionist'].includes(target.role)) {
    return NextResponse.json(
      { error: 'Can only reset counselor or receptionist passwords here' },
      { status: 400 }
    )
  }

  // Branch-scoped admins can only reset accounts within their own branch — CEO unrestricted.
  if (isBranchScopedAdmin(admin) && target.branch_id !== admin.branch_id) {
    return NextResponse.json({ error: 'Not in your branch' }, { status: 403 })
  }

  const wasProvided = !!providedPassword?.trim()
  const newPassword = wasProvided ? providedPassword!.trim() : generateTempPassword()

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // Counselors table has no auth_user_id column — look up the Supabase auth user by
  // email, same pattern already used by the deactivate/delete routes.
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const authUser = authUsers?.users?.find((u) => u.email === target.email)

  if (!authUser) {
    return NextResponse.json({ error: 'No linked login account found for this email' }, { status: 404 })
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
    password: newPassword,
  })

  if (updateError) {
    console.error('[reset-password] updateUserById error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Notify the account owner — they should know an admin changed their password,
  // same principle as the existing self-service passwordChangedEmailHtml notification.
  await sendEmail({
    to: target.email,
    subject: 'Your password was reset by an administrator',
    html: passwordChangedEmailHtml({
      name: target.name,
      whenPKT: new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }),
    }),
  })

  await logStaffActivity({
    counselorId: admin.id,
    actorRole: admin.role,
    actionType: 'password_reset',
    description: `${admin.name} reset the password for ${target.name} (${target.role})`,
    metadata: { targetId: target.id, targetRole: target.role },
  })

  return NextResponse.json({
    success: true,
    // Only echo the password back if it was auto-generated — never echo back a
    // password the admin typed in themselves.
    ...(wasProvided ? {} : { generatedPassword: newPassword }),
  })
}
