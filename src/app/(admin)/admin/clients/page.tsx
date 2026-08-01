import { createAdminClient, requireAdmin, isBranchScoped } from '@/lib/supabase/server'
import { clientCounselorName } from '@/lib/supabase/relations'
import { AllClientsTable } from '@/components/admin/AllClientsTable'

export default async function AllClientsPage() {
  const admin = await requireAdmin()
  const supabase = createAdminClient()
  const scoped = isBranchScoped(admin)

  let clientsQuery = supabase
    .from('clients')
    .select(`*, ${clientCounselorName}`)
    .order('created_at', { ascending: false })
  let counselorsQuery = supabase
    .from('counselors')
    .select('id, name')
    .eq('role', 'counselor')
    .eq('status', 'active')
    .order('name')

  if (scoped) {
    clientsQuery = clientsQuery.eq('branch_id', admin.branch_id)
    counselorsQuery = counselorsQuery.eq('branch_id', admin.branch_id)
  }

  const [{ data: clients }, { data: counselors }] = await Promise.all([
    clientsQuery,
    counselorsQuery,
  ])

  const rows = (clients ?? []).map((client) => {
    const counselor = client.counselors as { name: string } | null
    const row = client as Record<string, unknown>
    return {
      id: client.id,
      name: client.name,
      client_code: row.client_code as string | null ?? null,
      email: row.email as string | null ?? null,
      phone: client.phone as string | null ?? null,
      counselor_id: client.counselor_id,
      counselor_name: counselor?.name ?? null,
      ad_source: client.ad_source,
      pipeline_stage: client.pipeline_stage ?? 1,
      qualification_score: client.qualification_score,
      created_at: client.created_at,
      status: (row.status as 'active' | 'suspended') ?? 'active',
    }
  })

  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="text-2xl font-semibold text-white md:text-3xl">All Clients</h1>
      <p className="mt-1 text-sm text-white/60">
        {rows.length} client{rows.length === 1 ? '' : 's'} across all counselors
      </p>

      <div className="mt-6">
        <AllClientsTable
          clients={rows}
          counselors={(counselors ?? []).map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </main>
  )
}
