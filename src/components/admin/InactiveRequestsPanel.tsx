'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

type RequestRow = {
  id: string
  clientId: string
  clientName: string
  clientCode: string
  requestedByName: string
  reviewedByName: string | null
  requestedActive: boolean
  reason: string | null
  status: string
  reviewNote: string | null
  createdAt: string
  reviewedAt: string | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function InactiveRequestsPanel() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({})

  async function load(nextStatus = status) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/inactive-requests?status=${nextStatus}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to load requests')
        return
      }
      setRequests(data.requests ?? [])
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  async function review(id: string, next: 'approved' | 'rejected') {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/inactive-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: next,
          note: next === 'rejected' ? rejectNotes[id]?.trim() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to update request')
        return
      }
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const filters: { id: typeof status; label: string }[] = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'all', label: 'All' },
  ]

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatus(f.id)}
            className={`min-h-[36px] rounded-full px-4 text-xs font-semibold ${
              status === f.id
                ? 'bg-grad-green text-text'
                : 'border border-white/15 text-white/60 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {loading && <p className="mt-6 text-sm text-white/50">Loading…</p>}

      {!loading && requests.length === 0 && (
        <p className="mt-6 text-sm text-white/50">No {status === 'all' ? '' : status} requests.</p>
      )}

      <div className="mt-6 space-y-4">
        {requests.map((req) => (
          <div key={req.id} className="rounded-2xl border border-white/10 glass-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/admin/clients/${req.clientId}`}
                  className="text-base font-semibold text-white hover:underline"
                >
                  {req.clientName}
                </Link>
                <p className="text-xs text-white/50">
                  {req.clientCode} · requested by {req.requestedByName} · {formatTime(req.createdAt)}
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white/70">
                {req.status}
              </span>
            </div>

            <p className="mt-3 text-sm">
              <span className="font-semibold text-white/80">Requesting:</span>{' '}
              <span className={req.requestedActive ? 'text-green' : 'text-red-300'}>
                {req.requestedActive ? 'Reactivate' : 'Mark inactive'}
              </span>
            </p>

            {req.reason && (
              <p className="mt-2 text-sm text-white/70">
                <span className="font-semibold text-white/80">Reason:</span> {req.reason}
              </p>
            )}

            {req.reviewNote && (
              <p className="mt-2 text-sm text-white/50">
                <span className="font-semibold text-white/70">Review note:</span> {req.reviewNote}
              </p>
            )}

            {req.status === 'pending' && (
              <div className="mt-4 space-y-3">
                <textarea
                  value={rejectNotes[req.id] ?? ''}
                  onChange={(e) =>
                    setRejectNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                  }
                  rows={2}
                  placeholder="Optional note if you reject…"
                  className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input placeholder:text-white/40"
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={busyId === req.id} onClick={() => review(req.id, 'approved')}>
                    {busyId === req.id ? '…' : 'Approve'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busyId === req.id}
                    onClick={() => review(req.id, 'rejected')}
                    className="text-white"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
