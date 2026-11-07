import { createAdminClient } from '@/lib/supabase/server'

export type MonthIncentives = {
  /** cleared and payable in this payroll month (active + already paid) */
  earned: number
  /** not yet cleared: shown, but not earned */
  pending: number
  /** on hold for review: shown, not netted */
  held: number
}

const empty = (): MonthIncentives => ({ earned: 0, pending: 0, held: 0 })

/**
 * Stored incentives (the ledger) grouped by counselor for a payroll month (YYYY-MM).
 * Used by Payroll and HR analytics so commissions come from one source of truth.
 * If the ledger tables are not applied yet, returns an empty map instead of failing the page.
 */
export async function incentivesByCounselor(month: string): Promise<Map<string, MonthIncentives>> {
  const supabase = createAdminClient()
  const period = `${month}-01`
  const map = new Map<string, MonthIncentives>()
  const row = (id: string) => {
    const r = map.get(id) ?? empty()
    map.set(id, r)
    return r
  }

  const { data, error } = await supabase
    .from('incentives')
    .select('counselor_id, amount, status, payable_period')
    .in('status', ['pending_clearance', 'active', 'held', 'paid'])
  if (error) {
    console.warn('[monthIncentives] incentives unavailable:', error.message)
    return map
  }
  for (const i of data ?? []) {
    const r = row(i.counselor_id as string)
    const amount = Number(i.amount)
    if (i.status === 'pending_clearance') r.pending += amount
    else if (i.status === 'held') r.held += amount
    else if (String(i.payable_period ?? '').slice(0, 10) === period) r.earned += amount
  }

  const { data: inst, error: instError } = await supabase
    .from('instructor_incentives')
    .select('instructor_id, amount, status, payable_period')
    .in('status', ['active', 'paid'])
  if (!instError) {
    for (const i of inst ?? []) {
      if (String(i.payable_period ?? '').slice(0, 10) === period) row(i.instructor_id as string).earned += Number(i.amount)
    }
  }
  return map
}
