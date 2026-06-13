'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react'

type Complaint = {
  id: string
  clientId: string | null
  clientName: string
  clientPhone: string
  subject: string
  body: string
  status: string
  submittedAt: string
  acknowledgedAt: string | null
  counselorName: string | null
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'open') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange/15 px-2.5 py-0.5 text-xs font-semibold text-orange">
        <Clock className="h-3 w-3" /> Open
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green/20 px-2.5 py-0.5 text-xs font-semibold text-text">
      <CheckCircle className="h-3 w-3" /> Acknowledged
    </span>
  )
}

export function ComplaintsManager() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [acknowledging, setAcknowledging] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'acknowledged'>('all')

  useEffect(() => {
    fetch('/api/admin/complaints')
      .then((r) => r.json())
      .then((d) => setComplaints(d.complaints ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function acknowledge(id: string) {
    setAcknowledging(id)
    const res = await fetch(`/api/complaints/${id}/acknowledge`, { method: 'PATCH' })
    if (res.ok) {
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status: 'acknowledged', acknowledgedAt: new Date().toISOString() }
            : c
        )
      )
    }
    setAcknowledging(null)
  }

  const filtered = complaints.filter((c) => filter === 'all' || c.status === filter)
  const openCount = complaints.filter((c) => c.status === 'open').length

  if (loading) {
    return <p className="text-sm text-text/50">Loading complaints...</p>
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-blue md:text-3xl">Complaints</h1>
          <p className="mt-1 text-sm text-text/60">
            {openCount} open · {complaints.length} total
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'open', 'acknowledged'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f
                  ? 'bg-text text-bg'
                  : 'bg-text/10 text-text hover:bg-text/20'
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
          <p className="font-semibold text-text">No complaints</p>
          <p className="text-sm text-text/50">
            {filter === 'open' ? 'No open complaints right now.' : 'Nothing to show.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((complaint) => (
            <div
              key={complaint.id}
              className="rounded-2xl border border-text/10 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={complaint.status} />
                    <span className="text-xs text-text/40">{timeAgo(complaint.submittedAt)}</span>
                  </div>
                  <p className="mt-2 font-semibold text-text">{complaint.subject}</p>
                  <p className="mt-0.5 text-sm text-text/60">
                    {complaint.clientName}
                    {complaint.clientPhone && (
                      <span className="ml-2 text-text/40">{complaint.clientPhone}</span>
                    )}
                    {complaint.counselorName && (
                      <span className="ml-2 text-text/40">· {complaint.counselorName}</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {complaint.status === 'open' && (
                    <button
                      onClick={() => acknowledge(complaint.id)}
                      disabled={acknowledging === complaint.id}
                      className="min-h-[36px] rounded-full bg-green px-4 py-1.5 text-xs font-semibold text-text transition-opacity hover:opacity-80 disabled:opacity-50"
                    >
                      {acknowledging === complaint.id ? 'Saving...' : 'Acknowledge'}
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === complaint.id ? null : complaint.id)}
                    className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full bg-text/8 text-text/60 hover:bg-text/15"
                    aria-label={expanded === complaint.id ? 'Collapse' : 'Expand'}
                  >
                    {expanded === complaint.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {expanded === complaint.id && (
                <div className="mt-4 rounded-xl bg-bg p-4 text-sm text-text/80 whitespace-pre-wrap">
                  {complaint.body}
                </div>
              )}

              {complaint.acknowledgedAt && (
                <p className="mt-3 text-xs text-text/40">
                  Acknowledged {timeAgo(complaint.acknowledgedAt)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
