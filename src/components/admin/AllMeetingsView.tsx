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
  if (status === 'completed') return 'bg-green/20 text-white'
  if (status === 'cancelled') return 'bg-orange/15 text-orange'
  return 'bg-white/10 text-white/70'
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

  if (loading) return <p className="text-sm text-white/50">Loading meetings...</p>

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">All Meetings</h1>
          <p className="mt-1 text-sm text-white/60">{filtered.length} meetings</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'scheduled', 'completed', 'cancelled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f ? 'tab-btn-active' : 'tab-btn-inactive'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-white/20" />
          <p className="mt-3 text-white/50">No meetings found</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 glass-card crisp-on-dark">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wide text-white/40">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Counselor</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/clients/${m.clientId}`}
                      className="font-medium text-white/80 hover:text-white hover:underline"
                    >
                      {m.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-white/60">
                      <User className="h-3.5 w-3.5 shrink-0 text-white/40" />
                      {m.counselorName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-white/30" />
                      {formatDate(m.scheduledTime)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-white/30" />
                      {formatTime(m.scheduledTime)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColor(m.status)}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="truncate text-white/50">{m.notes ?? '—'}</p>
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
