import { round2 } from '@/lib/ledger/incentives'

export type StructureLine = { label: string; type: 'earning' | 'deduction'; calc: 'fixed' | 'percent_of_basic' | 'percent_of_gross'; value: number }
export type PayrollInput = {
  basic: number
  lines: StructureLine[]
  incentivesActive: { id: string; amount: number }[]   // payable this period
  incentivesHeld: { id: string; amount: number; reason?: string }[]
  adjustments: { id: string; kind: string; amount: number; label?: string }[] // positive = deduct (clawback, advance repayment)
  carriedIn: number
}
export type PayrollLine = { label: string; type: 'basic' | 'earning' | 'deduction' | 'incentive' | 'held' | 'adjustment' | 'clawback' | 'advance_repayment' | 'carry_in' | 'carry_out'; amount: number; sourceRef?: string }
export type PayrollResult = {
  lines: PayrollLine[]
  basic: number; allowances: number; deductions: number
  incentivesEarned: number; incentivesHeld: number; adjustments: number
  carriedIn: number; carriedOut: number; net: number
  status: 'paid' | 'carried_forward' | 'partial'
}

/** Net = basic + allowances - deductions + incentives(active) - adjustments + carry-in. Held incentives are shown but excluded.
 *  If net is negative the shortfall is carried out and net paid is 0 ('carried_forward'), or partial when some pay remains. */
export function computePayroll(i: PayrollInput): PayrollResult {
  const lines: PayrollLine[] = [{ label: 'Basic salary', type: 'basic', amount: round2(i.basic) }]
  let allowances = 0, deductions = 0
  const gross0 = i.basic
  for (const l of i.lines) {
    const amt = l.calc === 'fixed' ? l.value : l.calc === 'percent_of_basic' ? (i.basic * l.value) / 100 : (gross0 * l.value) / 100
    const a = round2(amt)
    if (l.type === 'earning') { allowances += a; lines.push({ label: l.label, type: 'earning', amount: a }) }
    else { deductions += a; lines.push({ label: l.label, type: 'deduction', amount: -a }) }
  }
  const earned = round2(i.incentivesActive.reduce((s, x) => s + x.amount, 0))
  if (earned) lines.push({ label: 'Incentives (cleared)', type: 'incentive', amount: earned })
  const held = round2(i.incentivesHeld.reduce((s, x) => s + x.amount, 0))
  for (const h of i.incentivesHeld) lines.push({ label: `Held: ${h.reason ?? 'on hold'}`, type: 'held', amount: round2(h.amount), sourceRef: h.id })
  let adj = 0
  for (const a of i.adjustments) {
    adj += a.amount
    lines.push({ label: a.label ?? a.kind, type: a.kind === 'clawback' ? 'clawback' : a.kind === 'advance_repayment' ? 'advance_repayment' : 'adjustment', amount: -round2(a.amount), sourceRef: a.id })
  }
  if (i.carriedIn) lines.push({ label: 'Carried in', type: 'carry_in', amount: round2(i.carriedIn) })
  const raw = round2(i.basic + allowances - deductions + earned - adj + i.carriedIn)
  const net = Math.max(raw, 0)
  const carriedOut = raw < 0 ? round2(-raw) : 0
  if (carriedOut) lines.push({ label: 'Carried out', type: 'carry_out', amount: -carriedOut })
  return {
    lines, basic: round2(i.basic), allowances: round2(allowances), deductions: round2(deductions),
    incentivesEarned: earned, incentivesHeld: held, adjustments: round2(adj), carriedIn: round2(i.carriedIn), carriedOut, net,
    status: carriedOut > 0 ? (net > 0 ? 'partial' : 'carried_forward') : 'paid',
  }
}
