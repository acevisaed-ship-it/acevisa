'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flag, CheckCircle, Clock } from 'lucide-react'

type Escalation = {
  id: string
  clientId: string
  clientName: string
  counselorName: string | null
  questionText: string
  status: string
  createdAt: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function EscalationsView() {
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open')

  useEffect(() => {
    fetch('/api/admin/escalations')
      .then((r) => r.json())
      .then((d) => setEscalations(d.escalations ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function resolve(id: string) {
    setResolving(id)
    const res = await fetch('/api/admin/escalations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'resolved' }),
    })
    if (res.ok) {
      setEscalations((prev) => prev.map((e) => e.id === id ? { ...e, status: 'resolved' } : e))
    }
    setResolving(null)
  }

  const filtered = escalations.filter((e) => filter === 'all' || e.status === filter)
  const openCount = escalations.filter((e) => e.status === 'open').length

  if (loading) return <p className="text-sm text-text/50">Loading escalations...</p>

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-blue md:text-3xl">Escalations</h1>
          <p className="mt-1 text-sm text-text/60">{openCount} open · {escalations.length} total</p>
        </div>
        <div className="flex gap-2">
          {(['open', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f ? 'bg-text text-bg' : 'bg-text/10 text-text hover:bg-text/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <CheckCircle className="h-10 w-10 text-green" />
          <p className="text-text/50">No {filter === 'all' ? '' : filter} escalations</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((e) => (
            <div key={e.id} className="rounded-2xl border border-text/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {e.status === 'open' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange/15 px-2.5 py-0.5 text-xs font-semibold text-orange">
                        <Clock className="h-3 w-3" /> Open
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green/20 px-2.5 py-0.5 text-xs font-semibold text-text">
                        <CheckCircle className="h-3 w-3" /> Resolved
                      </span>
                    )}
                    <span className="text-xs text-text/40">{timeAgo(e.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-text/80">{e.questionText}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-text/50">
                    <Link href={`/admin/clients/${e.clientId}`} className="text-blue hover:underline">
                      {e.clientName}
                    </Link>
                    {e.counselorName && <span>Counselor: {e.counselorName}</span>}
                  </div>
                </div>
                {e.status === 'open' && (
                  <button
                    onClick={() => resolve(e.id)}
                    disabled={resolving === e.id}
                    className="min-h-[36px] rounded-full bg-green px-4 py-1.5 text-xs font-semibold text-text transition-opacity hover:opacity-80 disabled:opacity-50"
                  >
                    {resolving === e.id ? 'Saving...' : 'Mark Resolved'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
