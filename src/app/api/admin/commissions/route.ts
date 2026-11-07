import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { caseGross, computeIncentives, round2, type MilestoneInput, type ShareInput } from '@/lib/ledger/incentives'
import { counselorRateForProduct } from '@/lib/ledger/rates'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Nested<T> = T | T[] | null | undefined
const one = <T,>(v: Nested<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))

type Named = { name: string }
type DealRow = {
  id: string
  client_id: string
  counselor_id: string
  product_id: string | null
  service_type: string
  deal_value: number
  stage: string
  clients: Nested<{ name: string; branch_id: string | null }>
  counselors: Nested<Named>
}
type PaymentRow = { deal_id: string; amount: number; status: string | null }
type ExpenseRow = { deal_id: string; amount: number; reduce_gross: boolean | null }
type RefundRow = { deal_id: string; amount: number }
type MilestoneRow = {
  id: string
  deal_id: string
  type: string
  occurred_at: string
  holder_counselor_id: string | null
  counselors: Nested<Named>
}
type ShareRow = { deal_id: string; counselor_id: string; share_pct: number }
type IncentiveDbRow = {
  id: string
  deal_id: string
  milestone_id: string | null
  counselor_id: string
  amount: number
  status: string
  rate_snapshot: number | null
  gross_base: number | null
  pay_date: string | null
  payable_period: string | null
}
type ClearanceRow = { deal_id: string; status: string; cleared_at: string | null; created_at: string }
type InvoiceRow = { deal_id: string; product_id: string; created_at: string }
type ProductRow = { id: string; name: string }
type PctRow = { product_id: string; milestone_type: string; share_pct: number }

type LineOut = {
  milestoneType: string
  occurredAt: string
  counselorId: string
  counselorName: string
  milestonePct: number
  sharePct: number
  base: number
  rate: number
  amount: number
  projectedAmount: number
  state: string
  payDate: string | null
}
type CaseOut = {
  dealId: string
  clientName: string
  counselorId: string
  counselorName: string
  productName: string | null
  serviceType: string
  received: number
  refunded: number
  expenses: number
  gross: number
  clearance: string
  clearedAt: string | null
  lines: LineOut[]
  total: number
  warnings: string[]
}
type CounselorAgg = {
  counselorId: string
  name: string
  projected: number
  active: number
  held: number
  paid: number
}

/**
 * Read-only: for every case (deal) show gross, milestones reached, the commission each holder
 * would earn (projected) or has earned (stored incentive rows), and clearance state.
 * Uses the same maths as the clearance route, never writes.
 */
export async function GET(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const url = new URL(request.url)
  const counselorFilter = url.searchParams.get('counselorId')
  const supabase = createAdminClient()

  let q = supabase
    .from('deals')
    .select('id, client_id, counselor_id, product_id, service_type, deal_value, stage, clients!inner(name, branch_id), counselors!counselor_id(name)')
    .order('created_at', { ascending: false })
    .limit(500)
  if (isBranchScopedAdmin(admin)) q = q.eq('clients.branch_id', admin.branch_id)
  if (counselorFilter) q = q.eq('counselor_id', counselorFilter)
  const { data: deals, error: dealsError } = await q
  if (dealsError) {
    console.error('[commissions] deals query failed:', dealsError)
    return NextResponse.json({ error: 'Failed to load cases' }, { status: 500 })
  }
  const dealRows = (deals ?? []) as DealRow[]
  const dealIds = dealRows.map((d) => d.id)
  if (dealIds.length === 0) return NextResponse.json({ cases: [], byCounselor: [] })

  const [pay, exp, ref, ms, shares, inc, clr, inv] = await Promise.all([
    supabase.from('payments').select('deal_id, amount, status').in('deal_id', dealIds),
    supabase.from('expenses').select('deal_id, amount, reduce_gross').in('deal_id', dealIds).is('deleted_at', null),
    supabase.from('refunds').select('deal_id, amount').in('deal_id', dealIds).eq('status', 'paid'),
    supabase.from('milestones').select('id, deal_id, type, occurred_at, holder_counselor_id, counselors!holder_counselor_id(name)').in('deal_id', dealIds),
    supabase.from('case_counselor_shares').select('deal_id, counselor_id, share_pct').in('deal_id', dealIds).eq('status', 'approved'),
    supabase.from('incentives').select('id, deal_id, milestone_id, counselor_id, amount, status, rate_snapshot, gross_base, pay_date, payable_period').in('deal_id', dealIds).neq('status', 'reversed'),
    supabase.from('case_clearance').select('deal_id, status, cleared_at, created_at').in('deal_id', dealIds).order('created_at', { ascending: false }),
    supabase.from('invoices').select('deal_id, product_id, created_at').in('deal_id', dealIds).not('product_id', 'is', null).is('deleted_at', null).order('created_at', { ascending: false }),
  ])

  const payments = (pay.data ?? []) as PaymentRow[]
  const expensesRows = (exp.data ?? []) as ExpenseRow[]
  const refunds = (ref.error ? [] : ref.data ?? []) as RefundRow[]
  const milestones = (ms.data ?? []) as MilestoneRow[]
  const shareRows = (shares.data ?? []) as ShareRow[]
  const incentives = (inc.data ?? []) as IncentiveDbRow[]
  const clearances = (clr.data ?? []) as ClearanceRow[]
  const invoices = (inv.data ?? []) as InvoiceRow[]

  const productIds = new Set<string>()
  const invoiceProduct = new Map<string, string>()
  for (const i of invoices) if (!invoiceProduct.has(i.deal_id)) invoiceProduct.set(i.deal_id, i.product_id)
  for (const d of dealRows) {
    const p = d.product_id ?? invoiceProduct.get(d.id)
    if (p) productIds.add(p)
  }
  const [{ data: products }, { data: pcts }] = await Promise.all([
    productIds.size
      ? supabase.from('products').select('id, name').in('id', [...productIds])
      : Promise.resolve({ data: [] as ProductRow[] }),
    productIds.size
      ? supabase.from('product_milestone_shares').select('product_id, milestone_type, share_pct').in('product_id', [...productIds])
      : Promise.resolve({ data: [] as PctRow[] }),
  ])
  const productName = new Map((products ?? []).map((p) => [p.id, p.name]))
  const pctMap = new Map((pcts ?? []).map((r) => [`${r.product_id}:${r.milestone_type}`, Number(r.share_pct)]))

  const rateCache = new Map<string, number>()
  async function rate(cid: string, pid: string | null) {
    const key = `${cid}:${pid ?? ''}`
    if (!rateCache.has(key)) rateCache.set(key, await counselorRateForProduct(cid, pid))
    return rateCache.get(key)!
  }
  const names = new Map<string, string>()

  const cases: CaseOut[] = []
  for (const d of dealRows) {
    const productId: string | null = d.product_id ?? invoiceProduct.get(d.id) ?? null
    const dealPayments = payments.filter((p) => p.deal_id === d.id)
    const received = round2(dealPayments.filter((p) => (p.status ?? 'recorded') === 'recorded').reduce((s, p) => s + Number(p.amount), 0))
    const refunded = round2(refunds.filter((r) => r.deal_id === d.id).reduce((s, r) => s + Number(r.amount), 0))
    const expenses = expensesRows.filter((e) => e.deal_id === d.id)
    const expenseTotal = round2(expenses.filter((e) => e.reduce_gross !== false).reduce((s, e) => s + Number(e.amount), 0))
    const gross = caseGross([{ amount: received - refunded }], expenses.map((e) => ({ amount: Number(e.amount), reduce_gross: e.reduce_gross !== false })))

    const dealMs = milestones.filter((m) => m.deal_id === d.id)
    const warnings: string[] = []
    const approved: ShareInput[] = shareRows.filter((s) => s.deal_id === d.id).map((s) => ({ counselorId: s.counselor_id, sharePct: Number(s.share_pct) }))

    const msInputs: MilestoneInput[] = []
    for (const m of dealMs) {
      if (!m.holder_counselor_id) { warnings.push(`${m.type}: no holder recorded`); continue }
      names.set(m.holder_counselor_id, one(m.counselors)?.name ?? 'Unknown')
      const pct = productId ? pctMap.get(`${productId}:${m.type}`) : undefined
      if (pct == null) { warnings.push(`No milestone % set for "${m.type}" on this product`); continue }
      msInputs.push({ milestoneId: m.id, holderCounselorId: m.holder_counselor_id, milestonePct: pct })
    }
    if (!productId) warnings.push('No product linked to this case')

    const ids = new Set<string>([...msInputs.map((m) => m.holderCounselorId), ...approved.map((a) => a.counselorId)])
    const local = new Map<string, number>()
    for (const cid of ids) local.set(cid, await rate(cid, productId))

    let projected: ReturnType<typeof computeIncentives> = []
    try {
      projected = computeIncentives(gross, msInputs, (cid) => local.get(cid) ?? 0, approved.length ? () => approved : undefined)
    } catch (e) { warnings.push(e instanceof Error ? e.message : 'Calculation failed') }

    const stored = incentives.filter((i) => i.deal_id === d.id)
    const lines: LineOut[] = projected.map((p) => {
      const s = stored.find((i) => i.milestone_id === p.milestoneId && i.counselor_id === p.counselorId)
      const m = dealMs.find((x) => x.id === p.milestoneId)!
      return {
        milestoneType: m.type,
        occurredAt: m.occurred_at,
        counselorId: p.counselorId,
        counselorName: names.get(p.counselorId) ?? '',
        milestonePct: p.milestonePct,
        sharePct: p.sharePct,
        base: p.grossBase,
        rate: s ? Number(s.rate_snapshot) : p.rate,
        amount: s ? Number(s.amount) : p.amount,
        projectedAmount: p.amount,
        state: s ? s.status : 'projected',
        payDate: s?.pay_date ?? null,
      }
    })

    const latestClr = clearances.find((c) => c.deal_id === d.id)
    cases.push({
      dealId: d.id,
      clientName: one(d.clients)?.name ?? '',
      counselorId: d.counselor_id,
      counselorName: one(d.counselors)?.name ?? '',
      productName: productId ? productName.get(productId) ?? null : null,
      serviceType: d.service_type,
      received, refunded, expenses: expenseTotal, gross,
      clearance: latestClr?.status ?? 'none',
      clearedAt: latestClr?.cleared_at ?? null,
      lines,
      total: round2(lines.reduce((s, l) => s + l.amount, 0)),
      warnings,
    })
  }

  // only cases that have money or milestones
  const visible = cases.filter((c) => c.received > 0 || c.lines.length > 0)
  const byMap = new Map<string, CounselorAgg>()
  for (const c of visible) {
    for (const l of c.lines) {
      const r = byMap.get(l.counselorId) ?? { counselorId: l.counselorId, name: l.counselorName, projected: 0, active: 0, held: 0, paid: 0 }
      if (l.state === 'projected' || l.state === 'pending_clearance') r.projected += l.amount
      else if (l.state === 'active') r.active += l.amount
      else if (l.state === 'held') r.held += l.amount
      else if (l.state === 'paid') r.paid += l.amount
      byMap.set(l.counselorId, r)
    }
  }
  const byCounselor = [...byMap.values()].map((r) => ({ ...r, projected: round2(r.projected), active: round2(r.active), held: round2(r.held), paid: round2(r.paid) }))
    .sort((a, b) => (b.projected + b.active + b.held + b.paid) - (a.projected + a.active + a.held + a.paid))

  return NextResponse.json({ cases: visible, byCounselor })
}
