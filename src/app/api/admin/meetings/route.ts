import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const supabase = createAdminClient()

  // Branch Managers ('admin') only see meetings for clients in their own branch.
  // CEO (branch_id null) sees everything — no filter applied.
  const branchScoped = admin.role === 'admin'

  let query = supabase
    .from('meetings')
    .select(
      branchScoped
        ? 'id, scheduled_time, status, notes, client_id, counselor_id, clients!inner(name, branch_id), counselors(name)'
        : 'id, scheduled_time, status, notes, client_id, counselor_id, clients(name), counselors(name)'
    )
    .order('scheduled_time', { ascending: false })

  if (branchScoped) {
    query = query.eq('clients.branch_id', admin.branch_id)
  }

  const { data: meetings, error: fetchError } = await query

  if (fetchError) {
    console.error('Meetings fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
  }

  const rows = (meetings ?? []).map((m) => {
    const client = m.clients as { name: string } | { name: string }[] | null
    const counselor = m.counselors as { name: string } | { name: string }[] | null
    return {
      id: m.id,
      clientId: m.client_id,
      clientName: (Array.isArray(client) ? client[0]?.name : client?.name) ?? 'Unknown',
      counselorId: m.counselor_id,
      counselorName: (Array.isArray(counselor) ? counselor[0]?.name : counselor?.name) ?? 'Unknown',
      scheduledTime: m.scheduled_time,
      status: m.status,
      notes: m.notes ?? null,
    }
  })

  return NextResponse.json({ meetings: rows })
}
