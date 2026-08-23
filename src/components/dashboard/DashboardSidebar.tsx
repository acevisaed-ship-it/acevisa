'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarCheck, CheckSquare, ChevronLeft, ChevronRight, Download, Home, Kanban, LogOut, Mail, MessageSquareMore, Users, X } from 'lucide-react'
import { clearAceSessionCookies } from '@/lib/auth/session-cookies'
import { createClient } from '@/lib/supabase/client'
import { ProfilePicture } from '@/components/dashboard/ProfilePicture'
import { LogoHomeLink } from '@/components/ui/LogoHomeLink'
import { STAFF_INSTALL_PATH } from '@/components/StaffAppInstallCard'
import { cn } from '@/lib/utils'

// Client profile detail pages (not the clients list, not the chat sub-page)
// default the sidebar to its collapsed icon rail so the 3-panel layout gets
// full page width — everywhere else it opens expanded as before.
function isClientProfileRoute(pathname: string) {
  return /^\/dashboard\/clients\/[^/]+$/.test(pathname)
}

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  exact?: boolean
}

function buildNavItems(basePath: string, adminView: boolean): NavItem[] {
  const items: NavItem[] = [
    { href: basePath, label: "Today's Briefing", icon: Home, exact: true },
    { href: `${basePath}/pipeline`, label: 'Pipeline', icon: Kanban },
    { href: `${basePath}/tasks`, label: 'Tasks', icon: CheckSquare },
    { href: `${basePath}/clients`, label: 'Clients', icon: Users },
    { href: `${basePath}/hub`, label: 'Team Hub', icon: MessageSquareMore },
    { href: `${basePath}/email`, label: 'Email', icon: Mail },
  ]
  // Self check-in / leave applications only make sense for the counselor
  // viewing their own dashboard — not when admin/CEO is viewing a
  // counselor's panel (that page doesn't exist under /admin/counselors/*).
  if (!adminView) {
    items.splice(3, 0, { href: `${basePath}/attendance`, label: 'Attendance', icon: CalendarCheck })
  }
  return items
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
  collapsed = false,
  onToggleCollapsed,
}: {
  counselorId: string
  counselorName: string
  avatarUrl?: string | null
  basePath?: string
  adminView?: boolean
  onNavigate?: () => void
  collapsed?: boolean
  onToggleCollapsed?: () => void
}) {
  const pathname = usePathname()
  const navItems = buildNavItems(basePath, adminView)

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
      <div className={cn('flex items-center px-4 py-5', collapsed && 'justify-center px-2')}>
        {!collapsed && <LogoHomeLink href={basePath} size="lg" onClick={onNavigate} />}
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-bg/60 transition-colors hover:bg-[rgba(183,199,51,0.15)] hover:text-bg',
              !collapsed && 'ml-auto'
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={cn(
                'flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-grad-green crisp-on-dark text-text'
                  : 'text-bg hover:bg-[rgba(183,199,51,0.15)]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && label}
            </Link>
          )
        })}
        <Link
          href={STAFF_INSTALL_PATH}
          onClick={onNavigate}
          title={collapsed ? 'Get the app' : undefined}
          className={cn(
            'flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-[rgba(183,199,51,0.15)]',
            collapsed && 'justify-center px-0'
          )}
        >
          <Download className="h-4 w-4 shrink-0" />
          {!collapsed && 'Get the app'}
        </Link>
      </nav>

      <div className={cn('border-t border-bg/10 px-6 py-5', collapsed && 'px-2')}>
        <ProfilePicture
          counselorId={counselorId}
          counselorName={counselorName}
          avatarUrl={avatarUrl}
          size={collapsed ? 32 : 48}
          className={cn('mb-3 items-start', collapsed && 'mb-2 justify-center')}
        />
        {collapsed ? (
          adminView ? (
            <Link
              href="/admin/counselors"
              onClick={onNavigate}
              title="Back to admin"
              className="flex min-h-[36px] items-center justify-center text-orange hover:text-orange/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              className="flex min-h-[36px] w-full items-center justify-center text-orange hover:text-orange/80"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )
        ) : (
          <>
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
          </>
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
  const pathname = usePathname()
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null)
  const collapsed = manualCollapsed ?? isClientProfileRoute(pathname)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col glass-card-md crisp-on-dark rounded-2xl m-3 text-bg lg:flex transition-[width] duration-200',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <SidebarContent
          counselorId={counselorId}
          counselorName={counselorName}
          avatarUrl={avatarUrl}
          basePath={basePath}
          adminView={adminView}
          collapsed={collapsed}
          onToggleCollapsed={() => setManualCollapsed(!collapsed)}
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
