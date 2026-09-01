import { requireCeo } from '@/lib/supabase/server'
import { CeoAgentPanel } from '@/components/admin/CeoAgentPanel'

export default async function CeoAgentPage() {
  await requireCeo()

  return (
    <main className="flex-1 p-4 md:p-8">
      <CeoAgentPanel />
    </main>
  )
}
