'use client'

import Link from 'next/link'

export function LandingNav() {
  return (
    <nav className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-3 md:px-10 md:py-5">
      <div className="pointer-events-auto flex items-center gap-2 text-black">
        {/* Logo: compact on mobile, full-size on desktop — gradient backdrop keeps it visible on any section colour */}
        <Link
          href="/"
          className="rounded-xl px-1.5 py-1 transition-opacity hover:opacity-80 md:rounded-2xl md:px-2 md:py-1.5"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.42) 100%)', backdropFilter: 'blur(8px)' }}
        >
          <img src="/logo.png" alt="ACE Altius Consulting" className="h-10 w-auto md:h-20" />
        </Link>
      </div>
      <Link
        href="/dashboard"
        className="pointer-events-auto inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-out hover:scale-105 hover:shadow-lg active:scale-95 md:px-10 md:py-5 md:text-lg"
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
