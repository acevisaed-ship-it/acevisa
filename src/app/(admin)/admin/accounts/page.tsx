import { AccountsSection } from '@/components/admin/AccountsSection'
import { canMutateAccountEntries } from '@/lib/admin/accountEntries'
import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'

export default async function AccountsPage() {
  const admin = await requireAdmin()
  const supabase = createAdminClient()

  const [{ data: clients }, { data: deals }, { data: counselors }] = await Promise.all([
    supabase.from('clients').select('id, name, counselor_id, counselors!counselor_id(name)').order('name'),
    supabase.from('deals').select('id, client_id, deal_value, service_type'),
    supabase
      .from('counselors')
      .select('id, name')
      .eq('role', 'counselor')
      .eq('status', 'active')
      .order('name'),
  ])

  return (
    <main className="flex-1 p-4 md:p-8">
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
          return {
            id: row.id,
            name: row.name,
            counselor_id: row.counselor_id,
            counselor_name: counselorName ?? null,
          }
        })}
        deals={deals ?? []}
        counselors={counselors ?? []}
        canManageEntries={canMutateAccountEntries(admin.role)}
        showBranchFilter={!isBranchScopedAdmin(admin)}
      />
    </main>
  )
}
