'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
import { ProfilePicture } from '@/components/dashboard/ProfilePicture'

type Props = {
  adminId: string
  adminName: string
  adminRole: string
  avatarUrl?: string | null
  unassignedCount: number
  children: React.ReactNode
}

export function AdminShell({
  adminId,
  adminName,
  adminRole,
  avatarUrl,
  unassignedCount,
  children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen min-w-[1280px] bg-grad-teal">
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between glass-card-md crisp-on-dark px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-bg"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="inline-flex items-center justify-center rounded-xl bg-white/95 px-2 py-1">
          <img src="/logo.png" alt="ACE Altius Consulting" className="h-7 w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell counselorId={adminId} context="admin" variant="dark" />
          <ProfilePicture
            counselorId={adminId}
            counselorName={adminName}
            avatarUrl={avatarUrl}
            size={32}
          />
        </div>
      </header>

      <AdminSidebar
        adminId={adminId}
        adminName={adminName}
        adminRole={adminRole}
        avatarUrl={avatarUrl}
        unassignedCount={unassignedCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col pt-14 lg:pt-0">
        <header className="hidden shrink-0 items-center justify-end gap-3 px-6 py-3 lg:flex">
          <NotificationBell counselorId={adminId} context="admin" variant="dark" />
          <ProfilePicture
            counselorId={adminId}
            counselorName={adminName}
            avatarUrl={avatarUrl}
            size={36}
          />
          <span className="text-sm font-semibold text-white">{adminName}</span>
        </header>
        {children}
      </div>
    </div>
  )
}
