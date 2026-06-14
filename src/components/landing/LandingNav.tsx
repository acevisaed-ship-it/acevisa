'use client'

import Link from 'next/link'

export function LandingNav() {
  return (
    <nav className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-5 md:px-10">
      <div className="pointer-events-auto flex items-center gap-2 text-black">
        <img src="/Hero Page LOGO.svg" alt="ACE Altius Consulting" className="h-20 w-auto md:h-24" />
      </div>
      <Link
        href="/dashboard"
        className="pointer-events-auto text-xs text-text/60 transition-colors duration-700 hover:text-text md:text-sm"
      >
        counselor login
      </Link>
    </nav>
  )
}
