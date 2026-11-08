import { AccountsSection } from '@/components/admin/AccountsSection'
import { canMutateAccountEntries } from '@/lib/admin/accountEntries'
import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { createAdminClient, requireAccountant } from '@/lib/supabase/server'

/** The accountant's home: the Accounts module only. A branch-limited accountant sees only that branch. */
export default async function AccountantPage() {
  const accountant = await requireAccountant()
  const supabase = createAdminClient()
  const scoped = isBranchScopedAdmin(accountant)

  let clientQuery = supabase.from('clients').select('id, name, counselor_id, branch_id, counselors!counselor_id(name)').order('name')
  if (scoped) clientQuery = clientQuery.eq('branch_id', accountant.branch_id)
  const { data: clients } = await clientQuery
  const clientIds = new Set((clients ?? []).map((c) => (c as { id: string }).id))
  const { data: allDeals } = await supabase.from('deals').select('id, client_id, deal_value, service_type')
  const deals = (allDeals ?? []).filter((d) => !scoped || clientIds.has(d.client_id))

  return (
    <AccountsSection
      clients={(clients ?? []).map((c) => {
        const row = c as {
          id: string
          name: string
          counselor_id: string | null
          counselors?: { name: string } | { name: string }[] | null
        }
        const joined = row.counselors
        const counselorName = Array.isArray(joined) ? joined[0]?.name : joined?.name
        return { id: row.id, name: row.name, counselor_id: row.counselor_id, counselor_name: counselorName ?? null }
      })}
      deals={deals}
      counselors={[]}
      canManageEntries={canMutateAccountEntries(accountant.role)}
      showBranchFilter={!scoped}
      role="accountant"
    />
  )
}
