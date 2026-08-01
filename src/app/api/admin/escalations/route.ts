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
    .from('escalations')
    .select(
      branchScoped
        ? 'id, question_text, conversation_context, status, created_at, client_id, clients!inner(name, branch_id, counselors!clients_counselor_id_fkey(name))'
        : 'id, question_text, conversation_context, status, created_at, client_id, clients(name, counselors!clients_counselor_id_fkey(name))'
    )
    .order('created_at', { ascending: false })

  if (branchScoped) {
    query = query.eq('clients.branch_id', admin.branch_id)
  }

  const { data: escalations, error: fetchError } = await query

  if (fetchError) {
    console.error('Escalations fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch escalations' }, { status: 500 })
  }

  const rows = (escalations ?? []).map((e) => {
    const clientRaw = e.clients as ClientJoin | ClientJoin[] | null
    const client = Array.isArray(clientRaw) ? clientRaw[0] ?? null : clientRaw
    const counselorName = parseCounselorName(client?.counselors)
    return {
      id: e.id,
      clientId: e.client_id,
      clientName: client?.name ?? 'Unknown',
      counselorName,
      questionText: e.question_text,
      status: e.status,
      createdAt: e.created_at,
    }
  })

  return NextResponse.json({ escalations: rows })
}

export async function PATCH(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const { id, status } = await request.json()
  if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })

  const supabase = createAdminClient()

  if (isBranchScopedAdmin(admin)) {
    const { data: row } = await supabase
      .from('escalations')
      .select('id, clients!inner(branch_id)')
      .eq('id', id)
      .eq('clients.branch_id', admin.branch_id)
      .maybeSingle()
    if (!row) {
      return NextResponse.json({ error: 'Escalation not in your branch' }, { status: 403 })
    }
  }

  const { error: updateError } = await supabase
    .from('escalations')
    .update({ status })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  return NextResponse.json({ success: true })
}
