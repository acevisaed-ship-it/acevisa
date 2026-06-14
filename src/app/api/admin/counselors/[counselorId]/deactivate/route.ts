import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ counselorId: string }> }
) {
  const { error: authError } = await requireAdminApi()
  if (authError) return authError

  const { counselorId } = await params
  const supabase = createAdminClient()

  // Fetch counselor to get their email → Supabase auth user
  const { data: counselor } = await supabase
    .from('counselors')
    .select('id, email, status')
    .eq('id', counselorId)
    .single()

  if (!counselor) return NextResponse.json({ error: 'Counselor not found' }, { status: 404 })
  if (counselor.status === 'inactive') {
    return NextResponse.json({ error: 'Already inactive' }, { status: 409 })
  }

  // Find Supabase auth user by email and ban them (blocks login)
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const authUser = authUsers?.users?.find((u) => u.email === counselor.email)

  if (authUser) {
    await supabase.auth.admin.updateUserById(authUser.id, { ban_duration: '876600h' }) // ~100 years
  }

  // Set status inactive in counselors table
  await supabase.from('counselors').update({ status: 'inactive' }).eq('id', counselorId)

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ counselorId: string }> }
) {
  const { error: authError } = await requireAdminApi()
  if (authError) return authError

  const { counselorId } = await params
  const supabase = createAdminClient()

  const { data: counselor } = await supabase
    .from('counselors')
    .select('id, email')
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

  // Delete from Supabase Auth
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const authUser = authUsers?.users?.find((u) => u.email === counselor.email)
  if (authUser) await supabase.auth.admin.deleteUser(authUser.id)

  // Delete from counselors table
  await supabase.from('counselors').delete().eq('id', counselorId)

  return NextResponse.json({ success: true })
}
