'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CheckSquare, Home, Kanban, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  exact?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: "Today's Briefing", icon: Home, exact: true },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/dashboard/clients', label: 'Clients', icon: Users },
]

type Props = {
  counselorName: string
}

export function DashboardSidebar({ counselorName }: Props) {
  const pathname = usePathname()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-text text-bg md:flex">
      <div className="flex items-center gap-2 px-6 py-6 text-black">
        <img src="/logo.png" alt="ACE Altius Consulting" className="h-10 w-auto" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-green text-text'
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
        <p className="font-bold text-bg">{counselorName}</p>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-2 text-sm text-orange hover:underline"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
