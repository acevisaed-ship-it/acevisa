import { requireCeoApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/agent-drafts?status=pending — CEO Agent's review queue.
// CEO-only: this is the approval gate for everything the agent proposes.
export async function GET(request: Request) {
  const { error } = await requireCeoApi()
  if (error) return error

  const status = new URL(request.url).searchParams.get('status') ?? 'pending'
  const supabase = createAdminClient()

  let query = supabase
    .from('agent_task_drafts')
    .select(
      // Two FKs to counselors (target_counselor_id, reviewed_by) — must hint
      // by column name or PostgREST can't tell which relationship to embed.
      'id, draft_type, target_counselor_id, client_id, title, body, source_rule, metadata, status, created_at, reviewed_by, reviewed_at, counselors!target_counselor_id(name), clients(name)'
    )
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error: fetchError } = await query.limit(100)

  if (fetchError) {
    console.error('[agent-drafts GET] fetch failed:', fetchError.message)
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 })
  }

  return NextResponse.json({ drafts: data ?? [] })
}
