'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FilePenLine,
  Handshake,
  LogOut,
  Mail,
  Megaphone,
  MessageSquareMore,
  Settings,
  ShieldCheck,
  Sparkles,
  UserX,
  Users,
  Users2,
  Wallet,
  X,
} from 'lucide-react'
import { clearAceSessionCookies } from '@/lib/auth/session-cookies'
import { createClient } from '@/lib/supabase/client'
import { ProfilePicture } from '@/components/dashboard/ProfilePicture'
import { UnassignedCountBadge } from '@/components/admin/UnassignedCountBadge'
import { CorrectionCountBadge } from '@/components/admin/CorrectionCountBadge'
import { InactiveRequestCountBadge } from '@/components/admin/InactiveRequestCountBadge'
import { LogoHomeLink } from '@/components/ui/LogoHomeLink'
import { cn } from '@/lib/utils'

// Client profile detail pages (not the clients list, not the chat sub-page)
// default the sidebar to its collapsed icon rail so the 3-panel layout gets
// full page width — everywhere else it opens expanded as before.
function isClientProfileRoute(pathname: string) {
  return /^\/admin\/clients\/[^/]+$/.test(pathname)
}

type NavItem = {
  href: string
  label: string
  icon: typeof Users
  exact?: boolean
  badge?: 'unassigned' | 'corrections' | 'inactiveRequests'
}

const navItems: NavItem[] = [
  { href: '/admin/my-tasks', label: 'My Tasks', icon: CheckSquare },
  { href: '/admin/unassigned', label: 'Unassigned', icon: Users, badge: 'unassigned' },
  { href: '/admin/clients', label: 'All Clients', icon: Users },
  { href: '/admin/correction-requests', label: 'Corrections', icon: FilePenLine, badge: 'corrections' },
  { href: '/admin/team', label: 'Team', icon: Users2 },
  { href: '/admin/meetings', label: 'All Meetings', icon: Calendar },
  { href: '/admin/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/admin/performance', label: 'Performance', icon: BarChart3 },
  { href: '/admin/crm', label: 'CRM Pipeline', icon: Handshake },
  { href: '/admin/hub', label: 'Team Hub', icon: MessageSquareMore },
  { href: '/admin/email', label: 'Email', icon: Mail },
  { href: '/admin/accounts', label: 'Accounts', icon: Wallet },
  { href: '/admin/hr', label: 'HR', icon: ShieldCheck },
  { href: '/admin/activity', label: 'Staff Log and Activity', icon: ClipboardList },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

// Visible to 'ceo' (Super Admin) only.
const ceoOnlyNavItems: NavItem[] = [
  { href: '/admin/branches', label: 'Branches', icon: Building2 },
  { href: '/admin/ceo-agent', label: 'CEO Agent', icon: Sparkles },
  {
    href: '/admin/inactive-requests',
    label: 'Inactive Requests',
    icon: UserX,
    badge: 'inactiveRequests',
  },
]

const roleLabels: Record<string, string> = {
  ceo: 'Super Admin (CEO)',
  admin: 'Branch Manager',
}

type Props = {
  adminId: string
  adminName: string
  adminRole: string
  avatarUrl?: string | null
  unassignedCount: number
  isOpen: boolean
  onClose: () => void
}

function SidebarContent({
  adminId,
  adminName,
  adminRole,
  avatarUrl,
  unassignedCount,
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
}: {
  adminId: string
  adminName: string
  adminRole: string
  avatarUrl?: string | null
  unassignedCount: number
  onNavigate?: () => void
  collapsed?: boolean
  onToggleCollapsed?: () => void
}) {
  const isCeo = adminRole === 'ceo'
  const items = isCeo ? [...navItems, ...ceoOnlyNavItems] : navItems
  const pathname = usePathname()

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
        {!collapsed && <LogoHomeLink href="/admin" size="lg" onClick={onNavigate} />}
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

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {items.map(({ href, label, icon: Icon, exact, badge }) => {
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
              {!collapsed && <span className="flex-1">{label}</span>}
              {!collapsed && badge === 'unassigned' && (
                <UnassignedCountBadge initialCount={unassignedCount} />
              )}
              {!collapsed && badge === 'corrections' && <CorrectionCountBadge />}
              {!collapsed && badge === 'inactiveRequests' && <InactiveRequestCountBadge />}
            </Link>
          )
        })}
      </nav>

      <div className={cn('border-t border-bg/10 px-6 py-5', collapsed && 'px-2')}>
        <ProfilePicture
          counselorId={adminId}
          counselorName={adminName}
          avatarUrl={avatarUrl}
          size={collapsed ? 32 : 48}
          className={cn('mb-3 items-start', collapsed && 'mb-2 justify-center')}
        />
        {collapsed ? (
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="flex min-h-[36px] w-full items-center justify-center text-orange hover:text-orange/80"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : (
          <>
            <p className="font-bold text-bg">{adminName}</p>
            <p className="text-xs text-bg/60">{roleLabels[adminRole] ?? 'Admin'}</p>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-2 min-h-[44px] text-sm text-orange hover:underline"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </>
  )
}

export function AdminSidebar({
  adminId,
  adminName,
  adminRole,
  avatarUrl,
  unassignedCount,
  isOpen,
  onClose,
}: Props) {
  const pathname = usePathname()
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null)
  const collapsed = manualCollapsed ?? isClientProfileRoute(pathname)

  return (
    <>
      <aside
        className={cn(
          'hidden shrink-0 flex-col glass-card-md crisp-on-dark rounded-2xl m-3 text-bg lg:flex transition-[width] duration-200',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <SidebarContent
          adminId={adminId}
          adminName={adminName}
          adminRole={adminRole}
          avatarUrl={avatarUrl}
          unassignedCount={unassignedCount}
          collapsed={collapsed}
          onToggleCollapsed={() => setManualCollapsed(!collapsed)}
        />
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

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
          adminId={adminId}
          adminName={adminName}
          adminRole={adminRole}
          avatarUrl={avatarUrl}
          unassignedCount={unassignedCount}
          onNavigate={onClose}
        />
      </aside>
    </>
  )
}
