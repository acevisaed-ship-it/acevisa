import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { writeAudit } from '@/lib/ledger/audit'
import { recomputeDealIncentives } from '@/lib/ledger/persistIncentives'
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

  const recomputed = await recomputeDealIncentives({
    dealId,
    clearanceId: clearance.id,
    clearedAt,
    actor: { id: admin.id, role: admin.role, branch_id: admin.branch_id },
    reason: 'admin clearance',
  })
  if (recomputed.error) {
    return NextResponse.json(
      { error: `Case cleared but incentives failed: ${recomputed.error}`, clearance },
      { status: 500 }
    )
  }

  return NextResponse.json({ clearance, incentivesCreated: recomputed.inserted })
}
