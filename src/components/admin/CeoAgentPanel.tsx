'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Draft = {
  id: string
  title: string
  body: string
  source_rule: string
  status: string
  created_at: string
  counselors: { name: string } | null // target_counselor_id join — null when the draft is for the CEO's own attention
  clients: { name: string } | null
}

const RULE_LABELS: Record<string, string> = {
  retention_risk_review: 'Retention risk review',
}

export function CeoAgentPanel() {
  const [enabled, setEnabled] = useState(false)
  const [togglingEnabled, setTogglingEnabled] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [actingOn, setActingOn] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadDrafts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agent-drafts?status=pending')
      const data = await res.json()
      if (res.ok) setDrafts(data.drafts ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/admin/ceo-agent-settings')
      .then((r) => r.json())
      .then((d) => setEnabled(!!d.enabled))
      .finally(() => setSettingsLoaded(true))
    loadDrafts()
  }, [loadDrafts])

  async function toggleEnabled() {
    setTogglingEnabled(true)
    setError('')
    try {
      const next = !enabled
      const res = await fetch('/api/admin/ceo-agent-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to update'); return }
      setEnabled(next)
    } catch {
      setError('Something went wrong')
    } finally {
      setTogglingEnabled(false)
    }
  }

  async function act(id: string, status: 'approved' | 'rejected') {
    setActingOn(id)
    setError('')
    try {
      const res = await fetch(`/api/agent-drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Action failed'); return }
      setDrafts((cur) => cur.filter((d) => d.id !== id))
    } catch {
      setError('Something went wrong')
    } finally {
      setActingOn(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-white md:text-3xl">
            <Sparkles className="h-6 w-6 text-orange" />
            CEO Agent
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-white/60">
            Runs one narrow, named playbook rule each morning and drafts a task when it fires.
            Nothing here ever creates a real task, assigns anyone, or sends a notification on its
            own — every draft below needs your approval first.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 glass-card crisp-on-dark px-4 py-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-white/50">Daily review</p>
            <p className={cn('text-sm font-bold', enabled ? 'text-green' : 'text-white/40')}>
              {enabled ? 'ON' : 'OFF'}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleEnabled}
            disabled={!settingsLoaded || togglingEnabled}
            aria-label={enabled ? 'Turn off' : 'Turn on'}
            className={cn(
              'relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50',
              enabled ? 'bg-green' : 'bg-white/15'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform',
                enabled ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-400">{error}</p>}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-white">Pending review</h2>
        {loading ? (
          <p className="text-sm text-white/50">Loading…</p>
        ) : drafts.length === 0 ? (
          <p className="text-sm text-white/50">
            Nothing waiting on you right now. {!enabled && 'Daily review is off, so no new drafts will appear until you turn it on.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {drafts.map((d) => (
              <div key={d.id} className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white/80">{d.title}</p>
                      <span className="rounded-full bg-blue/20 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        {RULE_LABELS[d.source_rule] ?? d.source_rule}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-white/60">{d.body}</p>
                    <p className="mt-1.5 text-xs text-white/35">
                      {d.counselors?.name ? `For: ${d.counselors.name}` : 'For your own attention'}
                      {d.clients?.name ? ` · Client: ${d.clients.name}` : ''}
                      {' · '}
                      {new Date(d.created_at).toLocaleDateString('en-PK')}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={actingOn === d.id}
                      onClick={() => act(d.id, 'approved')}
                      className="flex items-center gap-1.5 rounded-full bg-green px-4 py-2 text-xs font-bold text-[#0A3F3A] disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={actingOn === d.id}
                      onClick={() => act(d.id, 'rejected')}
                      className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/60 hover:text-white disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
