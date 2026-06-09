import { createAdminClient } from '@/lib/supabase/server'
import { AllClientsTable } from '@/components/admin/AllClientsTable'

export default async function AllClientsPage() {
  const supabase = createAdminClient()

  const [{ data: clients }, { data: counselors }] = await Promise.all([
    supabase
      .from('clients')
      .select('*, counselors(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('counselors')
      .select('id, name')
      .eq('role', 'counselor')
      .eq('status', 'active')
      .order('name'),
  ])

  const rows = (clients ?? []).map((client) => {
    const counselor = client.counselors as { name: string } | null
    return {
      id: client.id,
      name: client.name,
      counselor_id: client.counselor_id,
      counselor_name: counselor?.name ?? null,
      ad_source: client.ad_source,
      pipeline_stage: client.pipeline_stage ?? 1,
      qualification_score: client.qualification_score,
      created_at: client.created_at,
    }
  })

  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="text-2xl font-semibold text-blue md:text-3xl">All Clients</h1>
      <p className="mt-1 text-sm text-text/60">
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
