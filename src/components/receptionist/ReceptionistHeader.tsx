'use client'

import { clearAceSessionCookies } from '@/lib/auth/session-cookies'
import { createClient } from '@/lib/supabase/client'
import { LogoHomeLink } from '@/components/ui/LogoHomeLink'

export function ReceptionistHeader({ name }: { name: string }) {
  async function handleSignOut() {
    const supabase = createClient()
    clearAceSessionCookies()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <header className="flex items-center justify-between glass-card-md crisp-on-dark px-4 py-3 md:px-8">
      <div className="flex items-center gap-3">
        <LogoHomeLink href="/receptionist" />
        <span className="hidden text-sm font-semibold text-bg/70 sm:inline">Reception Desk</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-bg">{name}</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="min-h-[44px] text-sm text-orange hover:underline"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
