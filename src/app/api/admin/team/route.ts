import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  const supabase = createAdminClient()

  const { data: counselors, error: fetchError } = await supabase
    .from('counselors')
    .select('id, name, email, status, role, avatar_url')
    .in('role', ['counselor', 'admin'])
    .order('name')

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }

  // Get client counts per counselor
  const { data: clientCounts } = await supabase
    .from('clients')
    .select('counselor_id')
    .not('counselor_id', 'is', null)

  const countMap: Record<string, number> = {}
  for (const c of clientCounts ?? []) {
    if (c.counselor_id) countMap[c.counselor_id] = (countMap[c.counselor_id] ?? 0) + 1
  }

  const rows = (counselors ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    status: c.status,
    role: c.role,
    avatarUrl: c.avatar_url ?? null,
    clientCount: countMap[c.id] ?? 0,
  }))

  return NextResponse.json({ counselors: rows })
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { name, email, password, role } = await request.json()
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email and password are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Failed to create auth user' }, { status: 400 })
  }

  // Insert into counselors table
  const { data: counselor, error: insertError } = await supabase
    .from('counselors')
    .insert({ name, email, status: 'active', role: role ?? 'counselor' })
    .select('id, name, email, status, role, avatar_url')
    .single()

  if (insertError) {
    // Rollback auth user
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Failed to create counselor record' }, { status: 500 })
  }

  return NextResponse.json({
    counselor: { ...counselor, avatarUrl: counselor.avatar_url ?? null, clientCount: 0 },
  })
}

export async function PATCH(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  // Only allow safe fields
  const allowed = ['name', 'status'] as const
  const patch: Record<string, string> = {}
  for (const key of allowed) {
    if (updates[key] !== undefined) patch[key] = updates[key]
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error: updateError } = await supabase.from('counselors').update(patch).eq('id', id)

  if (updateError) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  return NextResponse.json({ success: true })
}
