'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  Handshake,
  Megaphone,
  Receipt,
  Settings,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCircle,
  Users,
  Users2,
  Wallet,
  X,
} from 'lucide-react'
import { clearAceSessionCookies } from '@/lib/auth/session-cookies'
import { createClient } from '@/lib/supabase/client'
import { ProfilePicture } from '@/components/dashboard/ProfilePicture'
import { UnassignedCountBadge } from '@/components/admin/UnassignedCountBadge'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: typeof Users
  exact?: boolean
  badge?: 'unassigned'
}

const navItems: NavItem[] = [
  { href: '/admin/unassigned', label: 'Unassigned', icon: Users, badge: 'unassigned' },
  { href: '/admin/clients', label: 'All Clients', icon: Users },
  { href: '/admin/counselors', label: 'Counselors', icon: UserCircle },
  { href: '/admin/team', label: 'Team', icon: Users2 },
  { href: '/admin/meetings', label: 'All Meetings', icon: Calendar },
  { href: '/admin/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/admin/performance', label: 'Performance', icon: BarChart3 },
  { href: '/admin/crm', label: 'CRM Pipeline', icon: Handshake },
  { href: '/admin/accounts', label: 'Accounts', icon: Wallet },
  { href: '/admin/invoices', label: 'Invoices', icon: Receipt },
  { href: '/admin/hrm', label: 'Payroll', icon: Banknote },
  { href: '/admin/hr', label: 'HR', icon: ShieldCheck },
  { href: '/admin/complaints', label: 'Complaints', icon: AlertTriangle },
  { href: '/admin/escalations', label: 'Escalations', icon: ShieldAlert },
  { href: '/admin/activity', label: 'Activity Log', icon: ClipboardList },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

type Props = {
  adminId: string
  adminName: string
  avatarUrl?: string | null
  unassignedCount: number
  isOpen: boolean
  onClose: () => void
}

function SidebarContent({
  adminId,
  adminName,
  avatarUrl,
  unassignedCount,
  onNavigate,
}: {
  adminId: string
  adminName: string
  avatarUrl?: string | null
  unassignedCount: number
  onNavigate?: () => void
}) {
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
      <div className="flex items-center px-4 py-5">
        <div className="inline-flex items-center justify-center rounded-xl bg-white/95 px-2.5 py-1.5">
          <img src="/logo.png" alt="ACE Altius Consulting" className="h-9 w-auto" />
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ href, label, icon: Icon, exact, badge }) => {
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
              <span className="flex-1">{label}</span>
              {badge === 'unassigned' && (
                <UnassignedCountBadge initialCount={unassignedCount} />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-bg/10 px-6 py-5">
        <ProfilePicture
          counselorId={adminId}
          counselorName={adminName}
          avatarUrl={avatarUrl}
          size={48}
          className="mb-3 items-start"
        />
        <p className="font-bold text-bg">{adminName}</p>
        <p className="text-xs text-bg/60">Admin</p>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-2 min-h-[44px] text-sm text-orange hover:underline"
        >
          Sign out
        </button>
      </div>
    </>
  )
}

export function AdminSidebar({
  adminId,
  adminName,
  avatarUrl,
  unassignedCount,
  isOpen,
  onClose,
}: Props) {
  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col bg-grad-teal crisp-on-dark text-bg lg:flex">
        <SidebarContent
          adminId={adminId}
          adminName={adminName}
          avatarUrl={avatarUrl}
          unassignedCount={unassignedCount}
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
          'fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col bg-grad-teal crisp-on-dark transition-transform duration-300 lg:hidden',
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
          avatarUrl={avatarUrl}
          unassignedCount={unassignedCount}
          onNavigate={onClose}
        />
      </aside>
    </>
  )
}
