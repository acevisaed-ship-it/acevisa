import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { logStaffActivity } from '@/lib/activityLog'
import { NextResponse } from 'next/server'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ counselorId: string }> }
) {
  const { admin, error: authError } = await requireAdminApi()
  if (authError) return authError

  const { counselorId } = await params
  const supabase = createAdminClient()

  // Fetch counselor to get their email → Supabase auth user
  const { data: counselor } = await supabase
    .from('counselors')
    .select('id, name, email, role, status')
    .eq('id', counselorId)
    .single()

  if (!counselor) return NextResponse.json({ error: 'Counselor not found' }, { status: 404 })
  if (counselor.status === 'inactive') {
    return NextResponse.json({ error: 'Already inactive' }, { status: 409 })
  }

  // Find Supabase auth user by email and ban them (blocks login) — paginate,
  // listUsers() defaults to 50/page and auth.users also holds every client.
  let authUser: { id: string } | undefined
  for (let page = 1; page <= 50 && !authUser; page++) {
    const { data: authUsers } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    authUser = authUsers?.users?.find((u) => u.email === counselor.email)
    if (!authUsers?.users?.length || authUsers.users.length < 200) break
  }

  if (authUser) {
    await supabase.auth.admin.updateUserById(authUser.id, { ban_duration: '876600h' }) // ~100 years
  }

  // Set status inactive in counselors table
  await supabase.from('counselors').update({ status: 'inactive' }).eq('id', counselorId)

  await logStaffActivity({
    counselorId: admin.id,
    actorRole: admin.role,
    actionType: 'account_deactivated',
    description: `${admin.name} deactivated ${counselor.name}'s account (${counselor.role})`,
    metadata: { targetId: counselor.id, targetRole: counselor.role },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ counselorId: string }> }
) {
  const { admin, error: authError } = await requireAdminApi()
  if (authError) return authError

  const { counselorId } = await params
  const supabase = createAdminClient()

  const { data: counselor } = await supabase
    .from('counselors')
    .select('id, name, email, role')
    .eq('id', counselorId)
    .single()

  if (!counselor) return NextResponse.json({ error: 'Counselor not found' }, { status: 404 })

  // Check if they have active clients — prevent hard delete if so
  const { count } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('counselor_id', counselorId)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete — counselor has ${count} client(s). Deactivate instead.` },
      { status: 409 }
    )
  }

  // Delete from Supabase Auth — paginate, same reasoning as above.
  let authUser: { id: string } | undefined
  for (let page = 1; page <= 50 && !authUser; page++) {
    const { data: authUsers } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    authUser = authUsers?.users?.find((u) => u.email === counselor.email)
    if (!authUsers?.users?.length || authUsers.users.length < 200) break
  }
  if (authUser) await supabase.auth.admin.deleteUser(authUser.id)

  // Delete from counselors table
  await supabase.from('counselors').delete().eq('id', counselorId)

  await logStaffActivity({
    counselorId: admin.id,
    actorRole: admin.role,
    actionType: 'account_deleted',
    description: `${admin.name} permanently deleted ${counselor.name}'s account (${counselor.role})`,
    metadata: { targetName: counselor.name, targetRole: counselor.role },
  })

  return NextResponse.json({ success: true })
}
