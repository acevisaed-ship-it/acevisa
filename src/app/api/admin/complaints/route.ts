import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { parseCounselorName } from '@/lib/admin/parseCounselorJoin'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type ClientJoin = {
  name: string
  counselors: { name: string } | { name: string }[] | null
}

export async function GET() {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const branchScoped = isBranchScopedAdmin(admin)
  const supabase = createAdminClient()

  let query = supabase
    .from('complaints')
    .select(
      branchScoped
        ? 'id, client_id, client_name, client_phone, subject, body, status, created_at, acknowledged_at, acknowledged_by, clients!inner(name, branch_id, counselors!clients_counselor_id_fkey(name))'
        : 'id, client_id, client_name, client_phone, subject, body, status, created_at, acknowledged_at, acknowledged_by, clients(name, counselors!clients_counselor_id_fkey(name))'
    )
    .order('created_at', { ascending: false })

  if (branchScoped) {
    query = query.eq('clients.branch_id', admin.branch_id)
  }

  const { data: complaints, error: fetchError } = await query

  if (fetchError) {
    console.error('Complaints fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch complaints' }, { status: 500 })
  }

  const rows = (complaints ?? []).map((c) => {
    const clientRaw = c.clients as ClientJoin | ClientJoin[] | null
    const client = Array.isArray(clientRaw) ? clientRaw[0] ?? null : clientRaw
    const counselorName = parseCounselorName(client?.counselors)

    return {
      id: c.id,
      clientId: c.client_id,
      clientName: c.client_name,
      clientPhone: c.client_phone,
      subject: c.subject,
      body: c.body,
      status: c.status,
      submittedAt: c.created_at,
      acknowledgedAt: c.acknowledged_at,
      counselorName,
    }
  })

  return NextResponse.json({ complaints: rows })
}
