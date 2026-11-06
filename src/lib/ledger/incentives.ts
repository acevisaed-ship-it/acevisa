/**
 * Pure incentive maths (no DB). Rules from the owner decisions:
 *  gross = payments - expenses (reduce_gross only); refunds already reduce payments
 *  per-milestone base = gross * milestone_pct/100
 *  incentive = counselor's own rate * base * share_pct/100
 *  payroll month = month of clearance; pay date = 10th of the next month
 */

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export type PaymentLike = { amount: number; status?: string }
export type ExpenseLike = { amount: number; reduce_gross?: boolean }

export function caseGross(payments: PaymentLike[], expenses: ExpenseLike[]): number {
  const received = payments
    .filter((p) => (p.status ?? 'recorded') === 'recorded')
    .reduce((s, p) => s + Number(p.amount), 0)
  const spent = expenses
    .filter((e) => e.reduce_gross !== false)
    .reduce((s, e) => s + Number(e.amount), 0)
  return round2(received - spent)
}

export type MilestoneInput = {
  milestoneId: string
  holderCounselorId: string
  milestonePct: number // product share for this milestone
}
export type ShareInput = { counselorId: string; sharePct: number } // approved shares, sum 100

export type IncentiveRow = {
  milestoneId: string
  counselorId: string
  grossBase: number
  milestonePct: number
  sharePct: number
  rate: number
  amount: number
}

/** Throws when milestone percentages do not sum to 100, or shares do not sum to 100. */
export function computeIncentives(
  gross: number,
  milestones: MilestoneInput[],
  rateFor: (counselorId: string) => number,
  sharesFor?: (m: MilestoneInput) => ShareInput[] | null
): IncentiveRow[] {
  const base = Math.max(gross, 0)
  const rows: IncentiveRow[] = []
  for (const m of milestones) {
    const holders: ShareInput[] = sharesFor?.(m) ?? [
      { counselorId: m.holderCounselorId, sharePct: 100 },
    ]
    const sum = holders.reduce((s, h) => s + h.sharePct, 0)
    if (Math.abs(sum - 100) > 0.001) throw new Error(`Shares must sum to 100 (got ${sum})`)
    const milestoneBase = round2((base * m.milestonePct) / 100)
    for (const h of holders) {
      const rate = rateFor(h.counselorId)
      rows.push({
        milestoneId: m.milestoneId,
        counselorId: h.counselorId,
        grossBase: milestoneBase,
        milestonePct: m.milestonePct,
        sharePct: h.sharePct,
        rate,
        amount: round2((milestoneBase * h.sharePct * rate) / 10000),
      })
    }
  }
  return rows
}

export function validateMilestonePcts(pcts: number[]): boolean {
  return Math.abs(pcts.reduce((s, p) => s + p, 0) - 100) <= 0.001
}

/** Payroll month (first day, UTC date string) and pay date (10th of following month) for a clearance instant in PKT. */
export function payablePeriod(clearedAt: Date): { payableMonth: string; payDate: string } {
  // Pakistan time is UTC+5 with no DST
  const pkt = new Date(clearedAt.getTime() + 5 * 3600 * 1000)
  const y = pkt.getUTCFullYear()
  const m = pkt.getUTCMonth() // 0-based
  const pad = (n: number) => String(n).padStart(2, '0')
  const next = new Date(Date.UTC(y, m + 1, 10))
  return {
    payableMonth: `${y}-${pad(m + 1)}-01`,
    payDate: `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-10`,
  }
}

export type PaidIncentive = { counselorId: string; milestoneId: string; amount: number }

/** Clawback per counselor/milestone = paid amount minus recomputed amount, when positive. */
export function clawbacks(paid: PaidIncentive[], recomputed: IncentiveRow[]) {
  const out: { counselorId: string; milestoneId: string; amount: number }[] = []
  for (const p of paid) {
    const n = recomputed.find((r) => r.counselorId === p.counselorId && r.milestoneId === p.milestoneId)
    const diff = round2(p.amount - (n?.amount ?? 0))
    if (diff > 0) out.push({ counselorId: p.counselorId, milestoneId: p.milestoneId, amount: diff })
  }
  return out
}
