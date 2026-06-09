import { getAuthenticatedCounselor } from '@/lib/supabase/server'
import { getCounselorDashboardData } from '@/lib/dashboard/getCounselorDashboardData'
import { DashboardHome } from '@/components/dashboard/DashboardHome'

export default async function CounselorDashboardPage() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return null

  const data = await getCounselorDashboardData(counselor.id)
  if (!data) return null

  return <DashboardHome data={data} />
}
