'use client'

import { useState } from 'react'
import { MessageCircle, Calendar, FileText, HelpCircle, X, Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/student/chat', label: 'My Chat', icon: MessageCircle },
  { href: '/student/meetings', label: 'My Meetings', icon: Calendar },
  { href: '/student/documents', label: 'My Documents', icon: FileText },
  { href: '/student/complaint', label: 'Raise a Complaint', icon: HelpCircle },
]

function StudentNavLinks({
  clientId,
  pathname,
  onNavigate,
}: {
  clientId: string
  pathname: string | null
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-col gap-1 p-4">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname?.startsWith(href)
        return (
          <Link
            key={href}
            href={`${href}?clientId=${clientId}`}
            onClick={onNavigate}
            className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-[#B7C733] text-[#0A3F3A]'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function StudentSidebar({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden min-h-screen w-60 shrink-0 flex-col bg-[#0A3F3A] lg:flex">
        <div className="flex items-center border-b border-white/10 px-4 py-5">
          <div className="inline-flex items-center justify-center rounded-xl bg-white/95 px-2.5 py-1.5">
            <img src="/logo.png" alt="AceVisa" className="h-8 w-auto" />
          </div>
        </div>
        <StudentNavLinks clientId={clientId} pathname={pathname} />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between bg-[#0A3F3A] px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="inline-flex items-center justify-center rounded-xl bg-white/95 px-2 py-1">
          <img src="/logo.png" alt="AceVisa" className="h-7 w-auto" />
        </div>
        <div className="w-9" />
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-[#0A3F3A] lg:hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div className="inline-flex items-center justify-center rounded-xl bg-white/95 px-2 py-1">
                <img src="/logo.png" alt="AceVisa" className="h-7 w-auto" />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <StudentNavLinks
              clientId={clientId}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </>
      )}
    </>
  )
}
