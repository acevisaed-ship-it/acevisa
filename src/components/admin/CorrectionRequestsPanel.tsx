'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { CORRECTABLE_FIELD_LABELS, isCorrectableField } from '@/lib/receptionist/clientForm'

type RequestRow = {
  id: string
  clientId: string
  clientName: string
  clientCode: string
  clientPhone: string
  requestedByName: string
  currentValues: Record<string, string>
  proposedChanges: Record<string, string>
  reason: string | null
  status: string
  reviewNote: string | null
  createdAt: string
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

export function CorrectionRequestsPanel() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'applied' | 'all'>('pending')
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load(nextStatus = status) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/correction-requests?status=${nextStatus}`)
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
    const note =
      next === 'rejected'
        ? window.prompt('Optional note for the receptionist (why this was rejected):') ?? ''
        : ''
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/correction-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, note }),
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
    { id: 'applied', label: 'Applied' },
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
        <p className="mt-6 text-sm text-white/50">No {status === 'all' ? '' : status} correction requests.</p>
      )}

      <div className="mt-6 space-y-4">
        {requests.map((req) => {
          const fields = Object.keys(req.proposedChanges).filter(isCorrectableField)
          return (
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
                    {req.clientCode} · {req.clientPhone} · requested by {req.requestedByName} · {formatTime(req.createdAt)}
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white/70">
                  {req.status}
                </span>
              </div>

              {req.reason && (
                <p className="mt-3 text-sm text-white/70">
                  <span className="font-semibold text-white/80">Reason:</span> {req.reason}
                </p>
              )}

              <ul className="mt-4 space-y-2">
                {fields.map((field) => (
                  <li key={field} className="rounded-xl bg-white/5 px-3 py-2 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-white/40">
                      {CORRECTABLE_FIELD_LABELS[field]}
                    </p>
                    <p className="text-white/60">
                      {req.currentValues[field] || '—'}
                      <span className="mx-2 text-white/30">→</span>
                      <span className="font-semibold text-white">{req.proposedChanges[field] || '—'}</span>
                    </p>
                  </li>
                ))}
              </ul>

              {req.status === 'pending' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => review(req.id, 'approved')}
                  >
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
              )}

              {req.status === 'approved' && (
                <p className="mt-3 text-xs text-white/50">
                  Waiting for the receptionist to apply this change at the front desk.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
