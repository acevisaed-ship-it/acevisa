import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// All business rules live in the database function ledger_action (see migration 20261108040000).
// This route only authenticates, applies branch scope and calls it.
const CEO_ONLY = new Set(['owner.add', 'plan.set', 'vouchers.expire', 'instructor.set', 'instructor.plan'])

export async function POST(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const body = (await request.json().catch(() => ({}))) as { action?: string; params?: Record<string, unknown> }
  const action = body.action?.trim()
  const params = body.params ?? {}
  if (!action) return NextResponse.json({ error: 'action is required' }, { status: 400 })
  if (CEO_ONLY.has(action) && admin.role !== 'ceo') {
    return NextResponse.json({ error: 'CEO access only' }, { status: 403 })
  }

  const scoped = isBranchScopedAdmin(admin)
  const supabase = createAdminClient()

  // Actions not tied to a client: keep branch managers inside their own branch.
  if (scoped && action.startsWith('payroll.')) {
    if (action === 'payroll.build') {
      params.branchId = admin.branch_id
    } else {
      const { data: run } = await supabase.from('payroll_runs').select('branch_id').eq('id', String(params.runId ?? '')).maybeSingle()
      if (!run || run.branch_id !== admin.branch_id) {
        return NextResponse.json({ error: 'Run not in your branch' }, { status: 403 })
      }
    }
  }
  if (scoped && action.startsWith('advance.') && params.counselorId) {
    const { data: staff } = await supabase.from('counselors').select('branch_id').eq('id', String(params.counselorId)).maybeSingle()
    if (!staff || staff.branch_id !== admin.branch_id) {
      return NextResponse.json({ error: 'Staff member not in your branch' }, { status: 403 })
    }
  }

  const { data, error: rpcError } = await supabase.rpc('ledger_action', {
    p_action: action,
    p: params,
    p_actor: admin.id,
    p_role: admin.role,
    p_branch: scoped ? admin.branch_id : null,
  })
  if (rpcError) {
    // RAISE EXCEPTION messages are user-facing business errors
    return NextResponse.json({ error: rpcError.message }, { status: 400 })
  }
  return NextResponse.json(data ?? { ok: true })
}
