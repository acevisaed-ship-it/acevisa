import { AccountsSection } from '@/components/admin/AccountsSection'
import { canMutateAccountEntries } from '@/lib/admin/accountEntries'
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'

export default async function AccountsPage() {
  const admin = await requireAdmin()
  const supabase = createAdminClient()

  const [{ data: clients }, { data: deals }, { data: counselors }] = await Promise.all([
    supabase.from('clients').select('id, name, counselor_id').order('name'),
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
        clients={clients ?? []}
        deals={deals ?? []}
        counselors={counselors ?? []}
        canManageEntries={canMutateAccountEntries(admin.role)}
      />
    </main>
  )
}
