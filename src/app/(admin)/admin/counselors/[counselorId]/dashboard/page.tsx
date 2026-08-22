import { notFound } from 'next/navigation'
import { DashboardHome } from '@/components/dashboard/DashboardHome'
import { getCounselorDashboardData } from '@/lib/dashboard/getCounselorDashboardData'

type Props = {
  params: Promise<{ counselorId: string }>
}

export default async function AdminCounselorDashboardPage({ params }: Props) {
  const { counselorId } = await params
  const data = await getCounselorDashboardData(counselorId)

  if (!data) notFound()

  const basePath = `/admin/counselors/${counselorId}/dashboard`

  return (
    <DashboardHome
      data={data}
      tasksHref={`${basePath}/tasks`}
      briefBasePath={`${basePath}/brief`}
      showSendReport={false}
    />
  )
}
