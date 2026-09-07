import { requireCeo } from '@/lib/supabase/server'
import { CeoAgentPanel } from '@/components/admin/CeoAgentPanel'
import { CeoFocusSummary } from '@/components/admin/CeoFocusSummary'
import { getCeoFocusSummary } from '@/lib/admin/getCeoFocusSummary'

export const dynamic = 'force-dynamic'

export default async function CeoAgentPage() {
  await requireCeo()
  const summary = await getCeoFocusSummary()

  return (
    <main className="flex-1 space-y-8 p-4 md:p-8">
      <CeoFocusSummary summary={summary} />
      <CeoAgentPanel />
    </main>
  )
}
