import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { CounselorClientsList } from '@/components/dashboard/CounselorClientsList'
import type { CounselorClientRow } from '@/components/dashboard/CounselorClientsList'

type Props = {
  params: Promise<{ counselorId: string }>
}

export default async function AdminCounselorClientsPage({ params }: Props) {
  const { counselorId } = await params
  const supabase = createAdminClient()

  const [{ data: counselor }, { data: clients }] = await Promise.all([
    supabase
      .from('counselors')
      .select('id, name, role, status')
      .eq('id', counselorId)
      .single(),
    supabase
      .from('clients')
      .select('id, name, client_code, email, phone, city, pipeline_stage, qualification_score, registration_date')
      .eq('counselor_id', counselorId)
      .order('registration_date', { ascending: false }),
  ])

  if (!counselor || counselor.role !== 'counselor' || counselor.status !== 'active') {
    notFound()
  }

  const rows: CounselorClientRow[] = (clients ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    client_code: c.client_code ?? null,
    email: (c as Record<string, unknown>).email as string | null ?? null,
    phone: c.phone,
    city: c.city ?? null,
    pipeline_stage: c.pipeline_stage ?? 1,
    qualification_score: c.qualification_score ?? null,
    registration_date: c.registration_date,
  }))

  const basePath = `/admin/counselors/${counselorId}/dashboard`

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Clients</h1>
        <p className="mt-1 text-sm text-text/60">
          {rows.length} client{rows.length === 1 ? '' : 's'}
        </p>
      </div>

      <CounselorClientsList clients={rows} basePath={basePath} />
    </main>
  )
}
