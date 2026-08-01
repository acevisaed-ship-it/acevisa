import { createAdminClient, requireAdmin, isBranchScoped } from '@/lib/supabase/server'
import { UnassignedClientsList } from '@/components/admin/UnassignedClientsList'

export default async function UnassignedClientsPage() {
  const admin = await requireAdmin()
  const supabase = createAdminClient()
  const scoped = isBranchScoped(admin)

  let unassignedQuery = supabase
    .from('clients')
    .select('*')
    .is('counselor_id', null)
    .order('created_at', { ascending: false })
  let counselorsQuery = supabase
    .from('counselors')
    .select('id, name')
    .eq('role', 'counselor')
    .eq('status', 'active')
    .order('name')

  if (scoped) {
    unassignedQuery = unassignedQuery.eq('branch_id', admin.branch_id)
    counselorsQuery = counselorsQuery.eq('branch_id', admin.branch_id)
  }

  const [{ data: unassigned }, { data: counselors }, { data: campaigns }] = await Promise.all([
    unassignedQuery,
    counselorsQuery,
    supabase.from('campaigns').select('ad_source_code, campaign_name'),
  ])

  const campaignMap = Object.fromEntries(
    (campaigns ?? []).map((c) => [c.ad_source_code, c.campaign_name])
  )

  const clients = (unassigned ?? []).map((client) => ({
    id: client.id,
    name: client.name,
    phone: client.phone,
    city: client.city,
    language: client.language,
    ad_source: client.ad_source,
    created_at: client.created_at,
    campaignName: client.ad_source ? campaignMap[client.ad_source] ?? null : null,
  }))

  const count = clients.length

  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="text-2xl font-semibold text-white md:text-3xl">Unassigned Clients</h1>
      <p className="mt-1 text-sm text-text/60">
        {count} client{count === 1 ? '' : 's'} waiting for counselor assignment
      </p>

      <div className="mt-6">
        <UnassignedClientsList
          initialClients={clients}
          counselors={(counselors ?? []).map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </main>
  )
}
