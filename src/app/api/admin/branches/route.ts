import { requireAdminApi, requireCeoApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Any admin-panel role (Branch Manager or CEO) can list branches — needed for
// dropdowns (e.g. picking a branch when creating staff). Only CEO can create one.
export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  const supabase = createAdminClient()
  const { data: branches, error: fetchError } = await supabase
    .from('branches')
    .select('id, name, code, address, phone, is_active, created_at')
    .order('created_at', { ascending: true })

  if (fetchError) {
    console.error('[admin/branches] fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 })
  }

  // Attach headcounts per branch (staff + clients) — cheap enough at this scale.
  const branchIds = (branches ?? []).map((b) => b.id)
  const [{ data: staffCounts }, { data: clientCounts }] = await Promise.all([
    supabase.from('counselors').select('branch_id').in('branch_id', branchIds),
    supabase.from('clients').select('branch_id').in('branch_id', branchIds),
  ])

  const staffTally = new Map<string, number>()
  for (const row of staffCounts ?? []) {
    staffTally.set(row.branch_id, (staffTally.get(row.branch_id) ?? 0) + 1)
  }
  const clientTally = new Map<string, number>()
  for (const row of clientCounts ?? []) {
    clientTally.set(row.branch_id, (clientTally.get(row.branch_id) ?? 0) + 1)
  }

  const withCounts = (branches ?? []).map((b) => ({
    ...b,
    staffCount: staffTally.get(b.id) ?? 0,
    clientCount: clientTally.get(b.id) ?? 0,
  }))

  return NextResponse.json({ branches: withCounts })
}

export async function POST(request: Request) {
  const { error } = await requireCeoApi()
  if (error) return error

  const { name, code, address, phone } = await request.json() as {
    name?: string
    code?: string
    address?: string
    phone?: string
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: branch, error: insertError } = await supabase
    .from('branches')
    .insert({
      name: name.trim(),
      code: code?.trim() || null,
      address: address?.trim() || null,
      phone: phone?.trim() || null,
    })
    .select('id, name, code, address, phone, is_active, created_at')
    .single()

  if (insertError) {
    console.error('[admin/branches] insert error:', insertError)
    const message = insertError.code === '23505' ? 'That branch code is already in use' : 'Failed to create branch'
    return NextResponse.json({ error: message }, { status: insertError.code === '23505' ? 409 : 500 })
  }

  return NextResponse.json({ success: true, branch })
}
