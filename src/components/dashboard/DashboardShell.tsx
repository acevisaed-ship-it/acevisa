'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { DashboardSidebar } from './DashboardSidebar'

type Props = {
  counselorId: string
  counselorName: string
  avatarUrl?: string | null
  children: React.ReactNode
}

export function DashboardShell({
  counselorId,
  counselorName,
  avatarUrl,
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
        <div className="w-11" aria-hidden="true" />
      </header>

      <DashboardSidebar
        counselorId={counselorId}
        counselorName={counselorName}
        avatarUrl={avatarUrl}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-1 flex-col pt-14 lg:pt-0">{children}</div>
    </div>
  )
}
