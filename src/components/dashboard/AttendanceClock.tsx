'use client'

import { useEffect, useState } from 'react'
import { Clock, LogIn, LogOut, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type AttendanceRecord = {
  id: string
  date: string
  check_in: string | null
  check_out: string | null
  status: string
  notes?: string | null
}

const STATUS_STYLE: Record<string, string> = {
  present:  'bg-green/20 text-white',
  remote:   'bg-blue/20 text-white',
  half_day: 'bg-orange/15 text-orange',
  absent:   'bg-red-500/20 text-red-400',
  leave:    'glass-card text-white/40',
}
const STATUS_LABEL: Record<string, string> = {
  present: 'Present', remote: 'Remote', half_day: 'Half Day', absent: 'Absent', leave: 'Leave',
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Karachi',
  })
}

function formatClock(d: Date) {
  return d.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Karachi',
  })
}

export function AttendanceClock() {
  const [record, setRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Load today's record
  useEffect(() => {
    fetch('/api/counselor/attendance')
      .then((r) => r.json())
      .then((d) => setRecord(d.record))
      .finally(() => setLoading(false))
  }, [])

  // Load history when expanded
  useEffect(() => {
    if (!showHistory || history.length > 0) return
    setHistoryLoading(true)
    fetch('/api/counselor/attendance/history')
      .then((r) => r.json())
      .then((d) => setHistory(d.records ?? []))
      .finally(() => setHistoryLoading(false))
  }, [showHistory, history.length])

  async function handleAction(action: 'clock_in' | 'clock_out') {
    setError(null)
    setSuccess(null)
    setActing(true)

    // Location checks are disabled for now (see api/counselor/attendance) —
    // clock in/out no longer requires GPS permission or office network.
    try {
      const res = await fetch('/api/counselor/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
      } else {
        setRecord(data.record)
        setSuccess(action === 'clock_in' ? 'Clocked in successfully!' : 'Clocked out successfully!')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setActing(false)
    }
  }

  const hasClockedIn = !!record?.check_in
  const hasClockedOut = !!record?.check_out

  return (
    <div className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
      {/* Live clock */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-white/40" />
        <span className="text-xs font-medium text-white/40 uppercase tracking-wide">Attendance</span>
        <span className="ml-auto font-mono text-sm text-white/60">{formatClock(now)}</span>
      </div>

      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <>
          {/* Today's times */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl glass-card p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Clock In</p>
              <p className="mt-1 text-lg font-bold text-green">{formatTime(record?.check_in ?? null)}</p>
            </div>
            <div className="rounded-xl glass-card p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Clock Out</p>
              <p className="mt-1 text-lg font-bold text-orange">{formatTime(record?.check_out ?? null)}</p>
            </div>
          </div>

          {/* Action button */}
          {!hasClockedIn ? (
            <button
              type="button"
              onClick={() => handleAction('clock_in')}
              disabled={acting}
              className="flex w-full items-center justify-center gap-2 min-h-[48px] rounded-full bg-grad-green crisp-on-dark text-sm font-bold text-text transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {acting ? 'Clocking in…' : 'Clock In'}
            </button>
          ) : !hasClockedOut ? (
            <button
              type="button"
              onClick={() => handleAction('clock_out')}
              disabled={acting}
              className="flex w-full items-center justify-center gap-2 min-h-[48px] rounded-full bg-grad-blue crisp-on-dark text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {acting ? 'Clocking out…' : 'Clock Out'}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 min-h-[48px] rounded-full glass-card text-sm text-white/40">
              ✓ Done for today
            </div>
          )}

          {/* Feedback */}
          {error && (
            <p className="mt-3 rounded-xl bg-red-500/20 px-4 py-2.5 text-xs text-red-400">{error}</p>
          )}
          {success && (
            <p className="mt-3 rounded-xl bg-green/10 px-4 py-2.5 text-xs text-white/80">✓ {success}</p>
          )}

          {/* History toggle */}
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="mt-4 w-full text-center text-[11px] text-white/30 hover:text-white/60 transition-colors"
          >
            {showHistory ? '▲ Hide history' : '▼ View attendance history'}
          </button>

          {showHistory && (
            <div className="mt-3 border-t border-white/10 pt-3">
              {historyLoading ? (
                <p className="text-center text-xs text-white/30 py-2">Loading…</p>
              ) : history.length === 0 ? (
                <p className="text-center text-xs text-white/30 py-2">No records in the last 30 days</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {history.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 rounded-xl glass-card px-3 py-2">
                      <span className="text-xs text-white/50 w-20 shrink-0">{r.date}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0', STATUS_STYLE[r.status] ?? 'text-white/40')}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      <span className="text-xs text-white/50 ml-auto tabular-nums">
                        {formatTime(r.check_in)} → {formatTime(r.check_out)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
