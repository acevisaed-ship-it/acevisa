'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export function RegenerateProfileButton({ clientId }: { clientId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleClick() {
    setStatus('loading')
    try {
      const res = await fetch('/api/counselor/regenerate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      if (!res.ok) throw new Error('Failed')
      setStatus('done')
      // Reload the page after a short delay so the new profile is shown
      setTimeout(() => window.location.reload(), 800)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'loading' || status === 'done'}
      className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white/90 disabled:opacity-50"
    >
      <RefreshCw
        className={`h-3 w-3 ${status === 'loading' ? 'animate-spin' : ''}`}
      />
      {status === 'idle' && 'Regenerate AI Profile'}
      {status === 'loading' && 'Generating…'}
      {status === 'done' && 'Done — reloading…'}
      {status === 'error' && 'Error — try again'}
    </button>
  )
}
