import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { CounselorClientsList } from '@/components/dashboard/CounselorClientsList'
import type { CounselorClientRow } from '@/components/dashboard/CounselorClientsList'

export default async function ClientsPage() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return null

  const supabase = createAdminClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, client_code, email, phone, city, pipeline_stage, qualification_score, registration_date, status')
    .eq('counselor_id', counselor.id)
    .neq('status', 'removed')
    .order('registration_date', { ascending: false })

  const rows: CounselorClientRow[] = (clients ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    client_code: c.client_code ?? null,
    email: c.email ?? null,
    phone: c.phone,
    city: c.city ?? null,
    pipeline_stage: c.pipeline_stage ?? 1,
    qualification_score: c.qualification_score ?? null,
    registration_date: c.registration_date,
    status: ((c as Record<string, unknown>).status as 'active' | 'suspended') ?? 'active',
  }))

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Clients</h1>
        <p className="mt-1 text-sm text-white/60">
          {rows.length} client{rows.length === 1 ? '' : 's'}
        </p>
      </div>

      <CounselorClientsList clients={rows} basePath="/dashboard" />
    </main>
  )
}
