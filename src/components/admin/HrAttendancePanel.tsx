'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type CounselorOption = { id: string; name: string }

type AttendanceRecord = {
  id: string
  counselor_id: string
  date: string
  check_in: string | null
  check_out: string | null
  status: string
  notes: string | null
  counselors: { name: string } | null
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'bg-green/20 text-white' },
  { value: 'remote', label: 'Remote', color: 'bg-blue/20 text-white' },
  { value: 'half_day', label: 'Half Day', color: 'bg-orange/15 text-orange' },
  { value: 'absent', label: 'Absent', color: 'bg-red-500/20 text-red-400' },
  { value: 'leave', label: 'On Leave', color: 'glass-card text-white/40' },
]

function statusBadge(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[3]
}

function formatPKT(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Karachi',
  })
}

const inputClass = 'min-h-[44px] w-full rounded-full px-4 py-2 text-sm outline-none glass-input'
const selectClass = 'min-h-[44px] w-full rounded-full px-4 py-2 text-sm outline-none glass-input'

export function HrAttendancePanel({ counselors }: { counselors: CounselorOption[] }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [filterCounselorId, setFilterCounselorId] = useState('')
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [fCounselorId, setFCounselorId] = useState('')
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10))
  const [fCheckIn, setFCheckIn] = useState('')
  const [fCheckOut, setFCheckOut] = useState('')
  const [fStatus, setFStatus] = useState('present')
  const [fNotes, setFNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ month })
      if (filterCounselorId) qs.set('counselorId', filterCounselorId)
      const res = await fetch(`/api/admin/hr/attendance?${qs}`)
      const data = await res.json()
      if (res.ok) setRecords(data.records ?? [])
    } finally {
      setLoading(false)
    }
  }, [month, filterCounselorId])

  useEffect(() => { load() }, [load])

  function openModal() {
    setFCounselorId(counselors[0]?.id ?? '')
    setFDate(new Date().toISOString().slice(0, 10))
    setFCheckIn('')
    setFCheckOut('')
    setFStatus('present')
    setFNotes('')
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!fCounselorId || !fDate) { setError('Counselor and date are required'); return }
    setSaving(true)
    setError('')
    try {
      const toISO = (timeStr: string, dateStr: string) => {
        if (!timeStr) return null
        return `${dateStr}T${timeStr}:00+05:00`
      }
      const res = await fetch('/api/admin/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counselorId: fCounselorId,
          date: fDate,
          checkIn: toISO(fCheckIn, fDate),
          checkOut: toISO(fCheckOut, fDate),
          status: fStatus,
          notes: fNotes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Save failed'); return }
      setModalOpen(false)
      load()
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  // Summary stats
  const summary = counselors.map((c) => {
    const cRecords = records.filter((r) => r.counselor_id === c.id)
    return {
      counselorId: c.id,
      counselorName: c.name,
      present: cRecords.filter((r) => ['present', 'remote'].includes(r.status)).length,
      halfDay: cRecords.filter((r) => r.status === 'half_day').length,
      absent: cRecords.filter((r) => r.status === 'absent').length,
      leave: cRecords.filter((r) => r.status === 'leave').length,
    }
  })

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-white/50">Attendance records — visible to HR only</p>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="min-h-[44px] rounded-full px-4 text-sm outline-none glass-input"
          />
          <select
            value={filterCounselorId}
            onChange={(e) => setFilterCounselorId(e.target.value)}
            className="min-h-[44px] rounded-full px-4 text-sm outline-none glass-input"
          >
            <option value="">All Staff</option>
            {counselors.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-1.5 min-h-[44px] rounded-full bg-grad-blue crisp-on-dark px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Record
          </button>
        </div>
      </div>

      {/* Monthly summary cards */}
      {!filterCounselorId && (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {summary.map((s) => (
            <div key={s.counselorId} className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-4">
              <p className="text-sm font-semibold text-white/80">{s.counselorName}</p>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                <span className="text-white/50">Present</span><span className="font-bold text-green">{s.present + s.halfDay}</span>
                <span className="text-white/50">Absent</span><span className="font-bold text-red-400">{s.absent}</span>
                <span className="text-white/50">On Leave</span><span className="font-bold text-white/50">{s.leave}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Records table */}
      {loading ? (
        <p className="mt-4 text-sm text-white/50">Loading…</p>
      ) : records.length === 0 ? (
        <p className="mt-4 text-sm text-white/50">No attendance records for this period.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 glass-card crisp-on-dark">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40">
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Check In</th>
                <th className="px-4 py-3 font-medium">Check Out</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const badge = statusBadge(r.status)
                const name = r.counselors?.name ?? counselors.find((c) => c.id === r.counselor_id)?.name ?? '—'
                return (
                  <tr key={r.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 font-medium text-white/80">{name}</td>
                    <td className="px-4 py-3 text-white/60">{r.date}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', badge.color)}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60">{formatPKT(r.check_in)}</td>
                    <td className="px-4 py-3 text-white/60">{formatPKT(r.check_out)}</td>
                    <td className="px-4 py-3 text-white/50 text-xs">{r.notes ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
          onClick={() => setModalOpen(false)}
          role="presentation"
        >
          <div
            className="flex h-full w-full flex-col overflow-y-auto dark-modal p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Record Attendance</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/60 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && <p className="mb-3 rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-400">{error}</p>}

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Staff Member</label>
                <select value={fCounselorId} onChange={(e) => setFCounselorId(e.target.value)} className={selectClass}>
                  {counselors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Date</label>
                <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Status</label>
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={selectClass}>
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Check In (PKT)</label>
                  <input type="time" value={fCheckIn} onChange={(e) => setFCheckIn(e.target.value)} className={cn(inputClass, 'rounded-xl')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Check Out (PKT)</label>
                  <input type="time" value={fCheckOut} onChange={(e) => setFCheckOut(e.target.value)} className={cn(inputClass, 'rounded-xl')} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Notes (optional)</label>
                <input type="text" value={fNotes} onChange={(e) => setFNotes(e.target.value)} className={inputClass} placeholder="Any notes…" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-6 flex items-center justify-center gap-2 min-h-[48px] rounded-full bg-grad-blue crisp-on-dark px-6 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Record'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
