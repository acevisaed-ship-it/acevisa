'use client'

import Link from 'next/link'

export function LandingNav() {
  return (
    <nav className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-5 md:px-10">
      <div className="pointer-events-auto flex items-center gap-2 text-black">
        <img src="/logo.png" alt="ACE Altius Consulting" className="h-20 w-auto md:h-24" />
      </div>
      <Link
        href="/dashboard"
        className="pointer-events-auto inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-semibold text-white transition-all duration-200 ease-out hover:scale-105 hover:shadow-lg active:scale-95 md:px-10 md:py-5 md:text-lg"
        style={{
          background: 'linear-gradient(135deg, #2083B9 0%, #E48328 100%)',
          boxShadow: '0 0 0 2px rgba(32,131,185,0.35)',
        }}
      >
        Counselor Login
      </Link>
    </nav>
  )
}
