import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { writeAudit } from '@/lib/ledger/audit'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const body = (await request.json()) as { dealId?: string; notes?: string }
  const dealId = body.dealId?.trim()
  if (!dealId) {
    return NextResponse.json({ error: 'dealId is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: deal } = await supabase
    .from('deals')
    .select('id, client_id')
    .eq('id', dealId)
    .single()
  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  if (isBranchScopedAdmin(admin)) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('branch_id')
      .eq('id', deal.client_id)
      .single()
    if (!clientRow || clientRow.branch_id !== admin.branch_id) {
      return NextResponse.json({ error: 'Deal not in your branch' }, { status: 403 })
    }
  }

  const clearedAt = new Date()
  const { data: clearance, error: insertError } = await supabase
    .from('case_clearance')
    .insert({
      deal_id: dealId,
      status: 'cleared',
      cleared_by: admin.id,
      cleared_at: clearedAt.toISOString(),
      notes: body.notes?.trim() || null,
    })
    .select()
    .single()

  if (insertError || !clearance) {
    console.error('Clearance insert error:', insertError)
    // The database trigger rejects clearance with a readable reason (missing milestone %, shares not 100)
    const reason = insertError?.message ?? ''
    if (/milestone percentage|Approved shares/i.test(reason)) {
      return NextResponse.json({ error: reason }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to clear case' }, { status: 500 })
  }

  const audit = await writeAudit({
    actorId: admin.id,
    actorRole: admin.role,
    branchId: admin.branch_id,
    entityType: 'case_clearance',
    entityId: clearance.id,
    action: 'cleared',
    after: clearance,
  })
  if (audit.error) {
    return NextResponse.json({ error: 'Cleared but audit failed' }, { status: 500 })
  }

  // Incentives are activated by the database trigger on case_clearance (ledger_reconcile).
  const { count } = await supabase
    .from('incentives')
    .select('id', { count: 'exact', head: true })
    .eq('deal_id', dealId)
    .eq('status', 'active')

  return NextResponse.json({ clearance, incentivesCreated: count ?? 0 })
}
