import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { getAuthenticatedCounselor } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const counselor = await getAuthenticatedCounselor()

  if (!counselor) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <DashboardSidebar counselorName={counselor.name} />
      <div className="flex min-h-screen flex-1 flex-col">{children}</div>
    </div>
  )
}
