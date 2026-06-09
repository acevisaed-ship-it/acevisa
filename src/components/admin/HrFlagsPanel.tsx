'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'

type NegligenceFlag = {
  taskId: string
  counselorName: string
  clientName: string
  clientId: string | null
  taskTitle: string
  flaggedDate: string
}

type SlowResponse = {
  id: string
  counselorName: string
  clientName: string
  clientId: string | null
  studentMessageTime: string
  responseTimeHours: number | null
  responseDate: string | null
}

type OpenComplaint = {
  id: string
  clientId: string | null
  clientName: string | null
  subject: string
  body: string
  submittedDate: string
  counselorName: string
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HrFlagsPanel() {
  const [negligenceFlags, setNegligenceFlags] = useState<NegligenceFlag[]>([])
  const [slowResponses, setSlowResponses] = useState<SlowResponse[]>([])
  const [openComplaints, setOpenComplaints] = useState<OpenComplaint[]>([])
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [viewComplaint, setViewComplaint] = useState<OpenComplaint | null>(null)

  const loadFlags = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/hr-flags')
      const data = await res.json()
      if (res.ok) {
        setNegligenceFlags(data.negligenceFlags ?? [])
        setSlowResponses(data.slowResponses ?? [])
        setOpenComplaints(data.openComplaints ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFlags()
  }, [loadFlags])

  async function resolveFlag(taskId: string) {
    setResolvingId(taskId)
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}/resolve-flag`, { method: 'PATCH' })
      if (res.ok) {
        setNegligenceFlags((current) => current.filter((f) => f.taskId !== taskId))
      }
    } finally {
      setResolvingId(null)
    }
  }

  if (loading) {
    return <p className="mt-8 text-text/60">Loading HR flags…</p>
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-blue md:text-3xl">HR Flags</h1>
        <p className="mt-1 text-sm text-text/60">
          Negligence, slow responses, and open complaints requiring attention
        </p>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-text">
          Negligence Flags
          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-sm font-semibold text-red-700">
            {negligenceFlags.length}
          </span>
        </h2>
        {negligenceFlags.length === 0 ? (
          <p className="mt-3 text-sm text-text/60">No negligence flags.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-text/10 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-text/10 text-text/60">
                  <th className="px-4 py-3 font-medium">Counselor</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Flagged</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {negligenceFlags.map((flag) => (
                  <tr key={flag.taskId} className="border-b border-text/5 last:border-0">
                    <td className="px-4 py-3">{flag.counselorName}</td>
                    <td className="px-4 py-3">{flag.clientName}</td>
                    <td className="px-4 py-3">{flag.taskTitle}</td>
                    <td className="px-4 py-3 text-text/70">{formatDate(flag.flaggedDate)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => resolveFlag(flag.taskId)}
                        disabled={resolvingId === flag.taskId}
                        className="rounded-full bg-blue px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {resolvingId === flag.taskId ? 'Resolving…' : 'Mark Resolved'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-text">
          Slow Responses (&gt;24h)
          <span className="ml-2 rounded-full bg-orange/10 px-2 py-0.5 text-sm font-semibold text-orange">
            {slowResponses.length}
          </span>
        </h2>
        {slowResponses.length === 0 ? (
          <p className="mt-3 text-sm text-text/60">No slow responses recorded.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-text/10 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-text/10 text-text/60">
                  <th className="px-4 py-3 font-medium">Counselor</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Student message</th>
                  <th className="px-4 py-3 font-medium">Response time</th>
                  <th className="px-4 py-3 font-medium">Responded</th>
                </tr>
              </thead>
              <tbody>
                {slowResponses.map((row) => (
                  <tr key={row.id} className="border-b border-text/5 last:border-0">
                    <td className="px-4 py-3">{row.counselorName}</td>
                    <td className="px-4 py-3">{row.clientName}</td>
                    <td className="px-4 py-3 text-text/70">
                      {formatDate(row.studentMessageTime)}
                    </td>
                    <td className="px-4 py-3 font-medium text-orange">
                      {row.responseTimeHours !== null ? `${row.responseTimeHours}h` : '—'}
                    </td>
                    <td className="px-4 py-3 text-text/70">{formatDate(row.responseDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-text">
          Open Complaints
          <span className="ml-2 rounded-full bg-text/10 px-2 py-0.5 text-sm font-semibold text-text">
            {openComplaints.length}
          </span>
        </h2>
        {openComplaints.length === 0 ? (
          <p className="mt-3 text-sm text-text/60">No open complaints.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-text/10 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-text/10 text-text/60">
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Counselor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {openComplaints.map((complaint) => (
                  <tr key={complaint.id} className="border-b border-text/5 last:border-0">
                    <td className="px-4 py-3">{complaint.clientName ?? 'Unknown'}</td>
                    <td className="px-4 py-3">{complaint.subject}</td>
                    <td className="px-4 py-3 text-text/70">
                      {formatDate(complaint.submittedDate)}
                    </td>
                    <td className="px-4 py-3">{complaint.counselorName}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setViewComplaint(complaint)}
                        className="rounded-full border border-blue px-3 py-1.5 text-xs font-semibold text-blue"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {viewComplaint && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
          onClick={() => setViewComplaint(null)}
          role="presentation"
        >
          <div
            className="flex h-full w-full flex-col overflow-y-auto bg-bg p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-blue">{viewComplaint.subject}</h2>
                <p className="mt-1 text-sm text-text/60">
                  {viewComplaint.clientName} · {formatDate(viewComplaint.submittedDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewComplaint(null)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-text">{viewComplaint.body}</p>
            {viewComplaint.clientId && (
              <Link
                href={`/admin/clients/${viewComplaint.clientId}`}
                className="mt-6 inline-flex min-h-[44px] items-center text-sm font-semibold text-blue hover:underline"
              >
                View client profile →
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  )
}
