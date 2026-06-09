'use client'

import { usePathname } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'

type Props = {
  adminId: string
  adminName: string
  avatarUrl?: string | null
  unassignedCount: number
  children: React.ReactNode
}

export function AdminLayoutClient({
  adminId,
  adminName,
  avatarUrl,
  unassignedCount,
  children,
}: Props) {
  const pathname = usePathname()
  const isCounselorProxy = /^\/admin\/counselors\/[^/]+\/dashboard/.test(pathname)

  if (isCounselorProxy) {
    return <>{children}</>
  }

  return (
    <AdminShell
      adminId={adminId}
      adminName={adminName}
      avatarUrl={avatarUrl}
      unassignedCount={unassignedCount}
    >
      {children}
    </AdminShell>
  )
}
