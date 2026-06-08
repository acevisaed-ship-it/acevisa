import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
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
    <DashboardShell
      counselorId={counselor.id}
      counselorName={counselor.name}
      avatarUrl={counselor.avatar_url}
      headerActions={<NotificationBell counselorId={counselor.id} />}
    >
      {children}
    </DashboardShell>
  )
}
