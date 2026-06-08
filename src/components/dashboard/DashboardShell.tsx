'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { DashboardSidebar } from './DashboardSidebar'
import { ProfilePicture } from './ProfilePicture'

type Props = {
  counselorId: string
  counselorName: string
  avatarUrl?: string | null
  headerActions?: React.ReactNode
  children: React.ReactNode
}

export function DashboardShell({
  counselorId,
  counselorName,
  avatarUrl,
  headerActions,
  children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between bg-text px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-bg"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <img src="/logo.png" alt="ACE Altius Consulting" className="h-8 w-auto" />
        <div className="flex items-center gap-2">{headerActions}</div>
      </header>

      <DashboardSidebar
        counselorId={counselorId}
        counselorName={counselorName}
        avatarUrl={avatarUrl}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-1 flex-col pt-14 lg:pt-0">
        {/* Desktop top bar */}
        <header className="hidden shrink-0 items-center justify-end gap-3 border-b border-text/10 bg-bg px-6 py-3 lg:flex">
          {headerActions}
          <ProfilePicture
            counselorId={counselorId}
            counselorName={counselorName}
            avatarUrl={avatarUrl}
            size={36}
          />
          <span className="text-sm font-semibold text-text">{counselorName}</span>
        </header>
        {children}
      </div>
    </div>
  )
}
