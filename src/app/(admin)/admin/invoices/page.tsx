import { InvoiceManager } from '@/components/admin/InvoiceManager'
import { createAdminClient } from '@/lib/supabase/server'

export default async function InvoicesPage() {
  const supabase = createAdminClient()

  const [{ data: clients }, { data: deals }] = await Promise.all([
    supabase.from('clients').select('id, name, counselor_id').order('name'),
    supabase.from('deals').select('id, client_id, deal_value, service_type'),
  ])

  return (
    <main className="flex-1 p-4 md:p-8">
      <InvoiceManager clients={clients ?? []} deals={deals ?? []} />
    </main>
  )
}
