import { CampaignManager } from '@/components/admin/CampaignManager'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function CampaignsPage() {
  const supabase = createAdminClient()
  const { data: counselors } = await supabase
    .from('counselors')
    .select('id, name')
    .eq('role', 'counselor')
    .eq('status', 'active')
    .order('name')

  return (
    <main className="flex-1 p-4 md:p-8">
      <CampaignManager counselors={counselors ?? []} />
    </main>
  )
}
