'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Clock, User } from 'lucide-react'

type Meeting = {
  id: string
  clientId: string
  clientName: string
  counselorName: string
  counselorId: string
  scheduledTime: string
  status: string
  notes: string | null
}

function statusColor(status: string) {
  if (status === 'completed') return 'bg-green/20 text-text'
  if (status === 'cancelled') return 'bg-orange/15 text-orange'
  return 'bg-blue/15 text-blue'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PK', {
    hour: '2-digit', minute: '2-digit',
  })
}

export function AllMeetingsView() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all')

  useEffect(() => {
    fetch('/api/admin/meetings')
      .then((r) => r.json())
      .then((d) => setMeetings(d.meetings ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = meetings.filter((m) => filter === 'all' || m.status === filter)

  if (loading) return <p className="text-sm text-text/50">Loading meetings...</p>

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-blue md:text-3xl">All Meetings</h1>
          <p className="mt-1 text-sm text-text/60">{filtered.length} meetings</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'scheduled', 'completed', 'cancelled'] as const).map((f) => (
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
        <div className="mt-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-text/20" />
          <p className="mt-3 text-text/50">No meetings found</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-text/10 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-text/10 text-left text-xs font-semibold uppercase tracking-wide text-text/50">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Counselor</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-text/6">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-bg/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/clients/${m.clientId}`}
                      className="font-medium text-text hover:text-blue hover:underline"
                    >
                      {m.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-text/70">
                      <User className="h-3.5 w-3.5 shrink-0 text-blue" />
                      {m.counselorName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text/70">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-text/40" />
                      {formatDate(m.scheduledTime)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text/70">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-text/40" />
                      {formatTime(m.scheduledTime)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColor(m.status)}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="truncate text-text/50">{m.notes ?? '—'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
