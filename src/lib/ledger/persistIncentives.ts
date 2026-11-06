import { writeAudit } from '@/lib/ledger/audit'
import {
  caseGross,
  computeIncentives,
  payablePeriod,
  type ExpenseLike,
  type MilestoneInput,
  type PaymentLike,
  type ShareInput,
} from '@/lib/ledger/incentives'
import { counselorRateForProduct } from '@/lib/ledger/rates'
import { createAdminClient } from '@/lib/supabase/server'

type Actor = { id: string; role: string | null; branch_id: string | null }

export async function recomputeDealIncentives(opts: {
  dealId: string
  clearanceId: string
  clearedAt: Date
  actor: Actor
  reason?: string
}): Promise<{ error: string | null; inserted: number }> {
  const supabase = createAdminClient()

  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id, client_id, counselor_id')
    .eq('id', opts.dealId)
    .single()
  if (dealError || !deal) return { error: 'Deal not found', inserted: 0 }

  const { data: invoiceForProduct } = await supabase
    .from('invoices')
    .select('product_id')
    .eq('deal_id', opts.dealId)
    .not('product_id', 'is', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const productId = invoiceForProduct?.product_id ?? null

  const [
    { data: paymentRows },
    { data: expenseRows },
    refundResult,
    { data: milestoneRows },
    { data: shareRows },
    { data: sharePctRows },
  ] = await Promise.all([
    supabase.from('payments').select('amount, status').eq('deal_id', opts.dealId),
    supabase
      .from('expenses')
      .select('amount, reduce_gross, deleted_at')
      .eq('deal_id', opts.dealId)
      .is('deleted_at', null),
    supabase.from('refunds').select('amount, status').eq('deal_id', opts.dealId).eq('status', 'paid'),
    supabase
      .from('milestones')
      .select('id, type, holder_counselor_id')
      .eq('deal_id', opts.dealId),
    supabase
      .from('case_counselor_shares')
      .select('counselor_id, share_pct, status')
      .eq('deal_id', opts.dealId)
      .eq('status', 'approved'),
    productId
      ? supabase
          .from('product_milestone_shares')
          .select('milestone_type, share_pct')
          .eq('product_id', productId)
      : Promise.resolve({ data: [] as { milestone_type: string; share_pct: number }[] }),
  ])
  const refundRows = refundResult.error ? [] : (refundResult.data ?? [])

  const recorded = (paymentRows ?? [])
    .filter((p) => (p.status ?? 'recorded') === 'recorded')
    .reduce((s, p) => s + Number(p.amount), 0)
  const refunded = (refundRows ?? []).reduce((s, r) => s + Number(r.amount), 0)
  const payments: PaymentLike[] = [{ amount: recorded - refunded, status: 'recorded' }]
  const expenses: ExpenseLike[] = (expenseRows ?? []).map((e) => ({
    amount: Number(e.amount),
    reduce_gross: e.reduce_gross !== false,
  }))

  const gross = caseGross(payments, expenses)
  const pctByType = new Map(
    (sharePctRows ?? []).map((r) => [r.milestone_type as string, Number(r.share_pct)])
  )

  const milestones: MilestoneInput[] = []
  for (const m of milestoneRows ?? []) {
    if (!m.holder_counselor_id) continue
    const milestonePct = pctByType.get(m.type)
    if (milestonePct == null) {
      return {
        error: `Missing product_milestone_shares for ${m.type} on this product`,
        inserted: 0,
      }
    }
    milestones.push({
      milestoneId: m.id,
      holderCounselorId: m.holder_counselor_id,
      milestonePct,
    })
  }

  const approvedShares: ShareInput[] = (shareRows ?? []).map((s) => ({
    counselorId: s.counselor_id,
    sharePct: Number(s.share_pct),
  }))
  if (approvedShares.length > 0) {
    const shareSum = approvedShares.reduce((s, h) => s + h.sharePct, 0)
    if (Math.abs(shareSum - 100) > 0.001) {
      return { error: `Approved shares must sum to 100 (got ${shareSum})`, inserted: 0 }
    }
  }

  const rateCache = new Map<string, number>()
  const counselorIds = new Set<string>()
  for (const m of milestones) {
    counselorIds.add(m.holderCounselorId)
    for (const s of approvedShares) counselorIds.add(s.counselorId)
  }
  await Promise.all(
    [...counselorIds].map(async (id) => {
      rateCache.set(id, await counselorRateForProduct(id, productId))
    })
  )

  let rows
  try {
    rows = computeIncentives(
      gross,
      milestones,
      (counselorId) => rateCache.get(counselorId) ?? 0,
      approvedShares.length > 0 ? () => approvedShares : undefined
    )
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Incentive math failed', inserted: 0 }
  }

  const { payableMonth, payDate } = payablePeriod(opts.clearedAt)

  const { data: existing } = await supabase
    .from('incentives')
    .select(
      'id, deal_id, client_id, counselor_id, product_id, milestone_id, gross_base, milestone_pct, share_pct, rate_snapshot, amount, status'
    )
    .eq('deal_id', opts.dealId)
    .in('status', ['pending_clearance', 'active', 'held'])

  const live = existing ?? []
  if (live.length > 0) {
    const { error: reverseInsertError } = await supabase.from('incentives').insert(
      live.map((old) => ({
        deal_id: old.deal_id,
        client_id: old.client_id,
        counselor_id: old.counselor_id,
        product_id: old.product_id,
        milestone_id: old.milestone_id,
        gross_base: old.gross_base,
        milestone_pct: old.milestone_pct,
        share_pct: old.share_pct,
        rate_snapshot: old.rate_snapshot,
        amount: -Number(old.amount),
        status: 'reversed',
        reverses_id: old.id,
        created_by: opts.actor.id,
      }))
    )
    if (reverseInsertError) return { error: reverseInsertError.message, inserted: 0 }

    // Status-only mark so readers skip the original amounts. Rate and amount stay frozen.
    const { error: reverseUpdateError } = await supabase
      .from('incentives')
      .update({ status: 'reversed' })
      .in(
        'id',
        live.map((r) => r.id)
      )
    if (reverseUpdateError) return { error: reverseUpdateError.message, inserted: 0 }
  }

  if (rows.length === 0) {
    await writeAudit({
      actorId: opts.actor.id,
      actorRole: opts.actor.role,
      branchId: opts.actor.branch_id,
      entityType: 'deal',
      entityId: opts.dealId,
      action: 'incentives_recomputed',
      after: { clearanceId: opts.clearanceId, inserted: 0, reversed: live.length },
      reason: opts.reason ?? 'clearance',
    })
    return { error: null, inserted: 0 }
  }

  const { error: insertError } = await supabase.from('incentives').insert(
    rows.map((r) => ({
      deal_id: opts.dealId,
      client_id: deal.client_id,
      counselor_id: r.counselorId,
      product_id: productId,
      milestone_id: r.milestoneId,
      clearance_id: opts.clearanceId,
      gross_base: r.grossBase,
      milestone_pct: r.milestonePct,
      share_pct: r.sharePct,
      rate_snapshot: r.rate,
      amount: r.amount,
      status: 'active',
      payable_period: payableMonth,
      pay_date: payDate,
      created_by: opts.actor.id,
    }))
  )
  if (insertError) return { error: insertError.message, inserted: 0 }

  await writeAudit({
    actorId: opts.actor.id,
    actorRole: opts.actor.role,
    branchId: opts.actor.branch_id,
    entityType: 'deal',
    entityId: opts.dealId,
    action: 'incentives_recomputed',
    after: {
      clearanceId: opts.clearanceId,
      inserted: rows.length,
      reversed: live.length,
      gross,
      payableMonth,
      payDate,
    },
    reason: opts.reason ?? 'clearance',
  })

  return { error: null, inserted: rows.length }
}
