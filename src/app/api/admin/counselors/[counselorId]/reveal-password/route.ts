import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { createAdminClient } from '@/lib/supabase/server'
import { logStaffActivity } from '@/lib/activityLog'
import { readStaffPasswordVault } from '@/lib/auth/passwordVault'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ counselorId: string }> }
) {
  const { admin, error: authError } = await requireAdminApi()
  if (authError) return authError

  const { counselorId } = await params
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
      { error: 'Can only reveal counselor or receptionist passwords here' },
      { status: 400 }
    )
  }

  if (isBranchScopedAdmin(admin) && target.branch_id !== admin.branch_id) {
    return NextResponse.json({ error: 'Not in your branch' }, { status: 403 })
  }

  const password = await readStaffPasswordVault(supabase, target.id)

  await logStaffActivity({
    counselorId: admin.id,
    actorRole: admin.role,
    actionType: 'password_revealed',
    description: `${admin.name} revealed the saved password for ${target.name} (${target.role})`,
    metadata: { targetId: target.id, targetRole: target.role, found: !!password },
  })

  if (!password) {
    return NextResponse.json(
      {
        error:
          'No saved password for this account. Passwords set before this feature, or changed by the staff member themselves, cannot be recovered. Use Reset password to set a new one — after that, Reveal will show it.',
      },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, password })
}
