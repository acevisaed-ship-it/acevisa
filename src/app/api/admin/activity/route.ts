import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 200)
  const offset = Number(url.searchParams.get('offset') ?? 0)
  const counselorId = url.searchParams.get('counselorId')

  const branchScoped = isBranchScopedAdmin(admin)
  const supabase = createAdminClient()

  let query = supabase
    .from('activity_logs')
    .select(
      branchScoped
        ? 'id, action_type, description, created_at, client_id, counselor_id, metadata, clients(name, branch_id), counselors(name, branch_id)'
        : 'id, action_type, description, created_at, client_id, counselor_id, metadata, clients(name), counselors(name)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (branchScoped) {
    // Show client events in this branch OR staff events by counselors in this branch.
    query = query.or(
      `clients.branch_id.eq.${admin.branch_id},and(client_id.is.null,counselors.branch_id.eq.${admin.branch_id})`
    )
  }

  // Single-counselor view (Team card -> "Activity Log"). Still respects the
  // branch-scoping filter above for a Branch Manager, so they can't view a
  // counselor outside their own branch by guessing an id.
  if (counselorId) {
    query = query.eq('counselor_id', counselorId)
  }

  const { data: logs, error: fetchError, count } = await query

  if (fetchError) {
    console.error('Activity log fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 })
  }

  const rows = (logs ?? []).map((log) => {
    const client = log.clients as { name: string } | { name: string }[] | null
    const counselor = log.counselors as { name: string } | { name: string }[] | null
    return {
      id: log.id,
      actionType: log.action_type,
      description: log.description,
      createdAt: log.created_at,
      clientId: log.client_id,
      clientName: (Array.isArray(client) ? client[0]?.name : client?.name) ?? null,
      counselorId: log.counselor_id,
      counselorName: (Array.isArray(counselor) ? counselor[0]?.name : counselor?.name) ?? null,
      metadata: log.metadata,
    }
  })

  return NextResponse.json({ logs: rows, total: count ?? 0 })
}
