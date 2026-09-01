'use client'

import Link from 'next/link'
import { useScrollStore } from '@/lib/stores/scrollStore'

export function LandingNav() {
  const goToSection = useScrollStore((s) => s.goToSection)

  return (
    <nav className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-3 md:px-10 md:py-4">
      <div className="pointer-events-auto flex items-center text-black">
        {/* Logo: scrolls back to Hero (section 0) */}
        <button
          type="button"
          onClick={() => goToSection(0)}
          className="rounded-xl px-2 py-1.5 transition-opacity hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.42) 100%)', backdropFilter: 'blur(8px)' }}
        >
          <img src="/logo.png" alt="ACE Altius Consulting" className="h-9 w-auto md:h-12" />
        </button>
      </div>
      <Link
        href="/dashboard"
        className="pointer-events-auto inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white transition-all duration-200 ease-out hover:scale-105 hover:shadow-lg active:scale-95 md:px-6 md:py-2.5 md:text-base"
        style={{
          background: 'linear-gradient(135deg, #2083B9 0%, #E48328 100%)',
          boxShadow: '0 0 0 2px rgba(32,131,185,0.35)',
        }}
      >
        {/* Shorter label on mobile to save horizontal space */}
        <span className="md:hidden">Login</span>
        <span className="hidden md:inline">Counselor Login</span>
      </Link>
    </nav>
  )
}
