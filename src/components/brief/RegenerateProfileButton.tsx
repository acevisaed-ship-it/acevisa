'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function RegenerateProfileButton({ clientId }: { clientId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const router = useRouter()

  async function handleClick() {
    setStatus('loading')
    try {
      const res = await fetch('/api/counselor/regenerate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setStatus('done')
      // router.refresh() re-runs the server component without browser cache
      setTimeout(() => router.refresh(), 600)
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      console.error('[RegenerateProfileButton]', err)
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
