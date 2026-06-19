'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CheckSquare, Home, Kanban, Users, X } from 'lucide-react'
import { clearAceSessionCookies } from '@/lib/auth/session-cookies'
import { createClient } from '@/lib/supabase/client'
import { ProfilePicture } from '@/components/dashboard/ProfilePicture'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  exact?: boolean
}

function buildNavItems(basePath: string): NavItem[] {
  return [
    { href: basePath, label: "Today's Briefing", icon: Home, exact: true },
    { href: `${basePath}/pipeline`, label: 'Pipeline', icon: Kanban },
    { href: `${basePath}/tasks`, label: 'Tasks', icon: CheckSquare },
    { href: `${basePath}/clients`, label: 'Clients', icon: Users },
  ]
}

type Props = {
  counselorId: string
  counselorName: string
  avatarUrl?: string | null
  basePath?: string
  adminView?: boolean
  isOpen: boolean
  onClose: () => void
}

function SidebarContent({
  counselorId,
  counselorName,
  avatarUrl,
  basePath = '/dashboard',
  adminView = false,
  onNavigate,
}: {
  counselorId: string
  counselorName: string
  avatarUrl?: string | null
  basePath?: string
  adminView?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const navItems = buildNavItems(basePath)

  async function handleSignOut() {
    const supabase = createClient()
    clearAceSessionCookies()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      <div className="flex items-center px-4 py-5">
        <div className="inline-flex items-center justify-center rounded-xl bg-white/95 px-2.5 py-1.5">
          <img src="/logo.png" alt="ACE Altius Consulting" className="h-9 w-auto" />
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-grad-green crisp-on-dark text-text'
                  : 'text-bg hover:bg-[rgba(183,199,51,0.15)]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-bg/10 px-6 py-5">
        <ProfilePicture
          counselorId={counselorId}
          counselorName={counselorName}
          avatarUrl={avatarUrl}
          size={48}
          className="mb-3 items-start"
        />
        <p className="font-bold text-bg">{counselorName}</p>
        {adminView ? (
          <Link
            href="/admin/counselors"
            onClick={onNavigate}
            className="mt-2 inline-flex min-h-[44px] items-center text-sm text-orange hover:underline"
          >
            ← Back to admin
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2 min-h-[44px] text-sm text-orange hover:underline"
          >
            Sign out
          </button>
        )}
      </div>
    </>
  )
}

export function DashboardSidebar({
  counselorId,
  counselorName,
  avatarUrl,
  basePath = '/dashboard',
  adminView = false,
  isOpen,
  onClose,
}: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col glass-card-md crisp-on-dark rounded-2xl m-3 text-bg lg:flex">
        <SidebarContent
          counselorId={counselorId}
          counselorName={counselorName}
          avatarUrl={avatarUrl}
          basePath={basePath}
          adminView={adminView}
        />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar panel */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col glass-card-md crisp-on-dark transition-transform duration-300 lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex min-h-[44px] min-w-[44px] items-center justify-center text-bg"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent
          counselorId={counselorId}
          counselorName={counselorName}
          avatarUrl={avatarUrl}
          basePath={basePath}
          adminView={adminView}
          onNavigate={onClose}
        />
      </aside>
    </>
  )
}
