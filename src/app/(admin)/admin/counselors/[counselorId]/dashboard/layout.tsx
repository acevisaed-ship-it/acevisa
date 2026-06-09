import { notFound } from 'next/navigation'
import { AdminCounselorViewBanner } from '@/components/admin/AdminCounselorViewBanner'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'

type Props = {
  children: React.ReactNode
  params: Promise<{ counselorId: string }>
}

export default async function AdminCounselorDashboardLayout({ children, params }: Props) {
  await requireAdmin()

  const { counselorId } = await params
  const supabase = createAdminClient()

  const { data: counselor } = await supabase
    .from('counselors')
    .select('id, name, avatar_url, role, status')
    .eq('id', counselorId)
    .single()

  if (!counselor || counselor.role !== 'counselor' || counselor.status !== 'active') {
    notFound()
  }

  const basePath = `/admin/counselors/${counselorId}/dashboard`

  return (
    <DashboardShell
      counselorId={counselor.id}
      counselorName={counselor.name}
      avatarUrl={counselor.avatar_url}
      basePath={basePath}
      adminView
      banner={<AdminCounselorViewBanner counselorName={counselor.name} />}
    >
      {children}
    </DashboardShell>
  )
}
