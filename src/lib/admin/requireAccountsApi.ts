import { getAuthenticatedCounselor } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Access levels for the Accounts module.
 *   'full' = CEO, branch admin, accountant: income, expenses, ledgers, reports.
 *   'cash' = everything in 'full' plus counselors, who may only create invoices and record INCOMING payments
 *            for their own clients (never expenses, refunds, profit, payroll or commissions).
 * The helper returns the same `{ admin, error }` shape as requireAdminApi so routes can swap it in unchanged.
 */
export type AccountsLevel = 'full' | 'cash'

const FULL_ROLES = new Set(['ceo', 'admin', 'accountant'])

export async function requireAccountsApi(level: AccountsLevel = 'full') {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return { admin: null as null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const allowed = FULL_ROLES.has(counselor.role) || (level === 'cash' && counselor.role === 'counselor')
  if (!allowed) {
    console.warn('[requireAccountsApi] role not allowed:', counselor.role, level)
    return { admin: null as null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { admin: counselor, error: null as null }
}

/** Views and actions an accountant must not reach (salaries and commissions stay with the CEO and admins). */
export const ACCOUNTANT_BLOCKED_VIEWS = new Set(['v_payroll_wide', 'v_payroll_lines_wide', 'v_incentives_wide'])
export const ACCOUNTANT_ALLOWED_ACTIONS = new Set([
  'voucher.sell', 'voucher.apply', 'voucher.decide',
  'refund.request', 'refund.vendor_confirm', 'refund.approve', 'refund.reject', 'refund.pay',
  'service.charge', 'advance.create', 'language.update',
])

/**
 * A counselor may act on a client only when it is theirs: assigned to them, or they hold one of the client's cases.
 * Everyone else with 'full' access passes through (branch scoping is applied by the caller).
 */
export async function counselorOwnsClient(counselorId: string, clientId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data: client } = await supabase.from('clients').select('counselor_id').eq('id', clientId).maybeSingle()
  if (client?.counselor_id === counselorId) return true
  const { data: deal } = await supabase.from('deals').select('id').eq('client_id', clientId).eq('counselor_id', counselorId).limit(1).maybeSingle()
  return !!deal
}
