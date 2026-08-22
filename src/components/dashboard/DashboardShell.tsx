'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { DashboardSidebar } from './DashboardSidebar'
import { ProfilePicture } from './ProfilePicture'
import { NotificationBell } from './NotificationBell'
import { AlertToastHost } from './AlertToastHost'
import { PushNotificationOptIn } from '@/components/PushNotificationOptIn'
import { LogoHomeLink } from '@/components/ui/LogoHomeLink'

type Props = {
  counselorId: string
  counselorName: string
  avatarUrl?: string | null
  headerActions?: React.ReactNode
  basePath?: string
  adminView?: boolean
  banner?: React.ReactNode
  children: React.ReactNode
}

export function DashboardShell({
  counselorId,
  counselorName,
  avatarUrl,
  headerActions,
  basePath = '/dashboard',
  adminView = false,
  banner,
  children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen min-w-[1024px] bg-grad-teal">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between glass-card-md crisp-on-dark px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-bg"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <LogoHomeLink href={basePath} size="sm" className="px-2 py-1" />
        <div className="flex items-center gap-2">
          {!adminView && <NotificationBell counselorId={counselorId} variant="dark" />}
        </div>
      </header>

      {!adminView && <AlertToastHost />}
      {!adminView && <PushNotificationOptIn />}
      <DashboardSidebar
        counselorId={counselorId}
        counselorName={counselorName}
        avatarUrl={avatarUrl}
        basePath={basePath}
        adminView={adminView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col pt-14 lg:pt-0">
        {/* Desktop top bar */}
        <header className="hidden shrink-0 items-center justify-end gap-3 px-6 py-3 lg:flex">
          {headerActions}
          <ProfilePicture
            counselorId={counselorId}
            counselorName={counselorName}
            avatarUrl={avatarUrl}
            size={36}
          />
          <span className="text-sm font-semibold text-white">{counselorName}</span>
        </header>
        {banner}
        {children}
      </div>
    </div>
  )
}
