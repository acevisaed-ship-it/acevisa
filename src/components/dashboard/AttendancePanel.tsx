'use client'

import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Check, Clock, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type TodayRecord = {
  id: string
  date: string
  check_in: string | null
  check_out: string | null
  status: string
} | null

type LeaveApplication = {
  id: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string | null
  status: string
  review_note: string | null
  reviewed_at: string | null
  created_at: string
}

const LEAVE_TYPES = [
  { value: 'late_excuse', label: 'Late Arrival Excuse' },
  { value: 'absence_excuse', label: 'Absence Excuse' },
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'emergency', label: 'Emergency Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'other', label: 'Other' },
]

function statusColor(status: string) {
  if (status === 'approved') return 'bg-green/20 text-white'
  if (status === 'rejected') return 'bg-red-500/20 text-red-400'
  return 'bg-orange/15 text-orange'
}

function attendanceStatusColor(status: string) {
  if (status === 'present' || status === 'remote') return 'bg-green/20 text-white'
  if (status === 'half_day') return 'bg-orange/15 text-orange'
  if (status === 'late') return 'bg-orange/25 text-orange'
  if (status === 'absent') return 'bg-red-500/20 text-red-400'
  return 'glass-card text-white/40'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTimePKT(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Karachi',
  })
}

const inputClass = 'min-h-[44px] w-full rounded-full px-4 py-2 text-sm outline-none glass-input'

export function AttendancePanel() {
  const [today, setToday] = useState<string>('')
  const [isSunday, setIsSunday] = useState(false)
  const [cutoffLabel, setCutoffLabel] = useState('11:00 AM PKT')
  const [record, setRecord] = useState<TodayRecord>(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [loading, setLoading] = useState(true)

  const [applications, setApplications] = useState<LeaveApplication[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [fType, setFType] = useState('late_excuse')
  const [fStart, setFStart] = useState('')
  const [fEnd, setFEnd] = useState('')
  const [fReason, setFReason] = useState('')

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/counselor/attendance')
    const data = await res.json()
    if (res.ok) {
      setToday(data.today)
      setIsSunday(data.isSunday)
      setCutoffLabel(data.cutoffLabel)
      setRecord(data.record)
    }
    setLoading(false)
  }, [])

  const loadApplications = useCallback(async () => {
    const res = await fetch('/api/counselor/leave')
    const data = await res.json()
    if (res.ok) setApplications(data.applications ?? [])
  }, [])

  useEffect(() => {
    loadStatus()
    loadApplications()
  }, [loadStatus, loadApplications])

  async function handleCheckIn() {
    setCheckingIn(true)
    try {
      const res = await fetch('/api/counselor/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clock_in' }),
      })
      const data = await res.json()
      if (res.ok) setRecord(data.record)
    } finally {
      setCheckingIn(false)
    }
  }

  function openForm() {
    setFType('late_excuse')
    setFStart(today || new Date().toISOString().slice(0, 10))
    setFEnd(today || new Date().toISOString().slice(0, 10))
    setFReason('')
    setError('')
    setFormOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!fStart || !fEnd) {
      setError('Start and end dates are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/counselor/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveType: fType,
          startDate: fStart,
          endDate: fEnd,
          reason: fReason || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Submit failed')
        return
      }
      setFormOpen(false)
      loadApplications()
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Today's check-in */}
      <div className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-white">Today's Attendance</h2>
            <p className="mt-1 text-sm text-white/50">
              Check in by {cutoffLabel} to be marked present.
            </p>
          </div>
          {!loading && !isSunday && (
            <div className="flex items-center gap-3">
              {record?.status && (
                <span className={cn('rounded-full px-3 py-1.5 text-xs font-semibold capitalize', attendanceStatusColor(record.status))}>
                  {record.status.replace('_', ' ')}
                </span>
              )}
              {!record?.check_in && (
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="flex items-center gap-1.5 min-h-[44px] rounded-full bg-grad-blue crisp-on-dark px-5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Clock className="h-4 w-4" />
                  {checkingIn ? 'Checking in…' : 'Check In'}
                </button>
              )}
            </div>
          )}
        </div>

        {isSunday && (
          <p className="mt-3 text-sm text-white/40">Sunday is not a working day.</p>
        )}

        {!loading && !isSunday && record?.check_in && (
          <p className="mt-3 text-xs text-white/40">Checked in at {formatTimePKT(record.check_in)} PKT</p>
        )}
      </div>

      {/* Leave / excuse applications */}
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-white">My Applications</h2>
            <p className="mt-1 text-sm text-white/50">
              Submit a late-arrival or absence excuse, or request leave.
            </p>
          </div>
          <button
            type="button"
            onClick={openForm}
            className="flex items-center gap-1.5 min-h-[44px] rounded-full bg-green px-4 text-sm font-bold text-text w-fit"
          >
            <Plus className="h-4 w-4" />
            Submit Application
          </button>
        </div>

        {applications.length === 0 ? (
          <p className="mt-4 text-sm text-white/50">No applications submitted yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 glass-card crisp-on-dark">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40">
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-white/70 capitalize">
                      {LEAVE_TYPES.find((t) => t.value === app.leave_type)?.label ?? app.leave_type}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {formatDate(app.start_date)} → {formatDate(app.end_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold capitalize', statusColor(app.status))}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40 italic">
                      {app.review_note ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
          onClick={() => setFormOpen(false)}
          role="presentation"
        >
          <div
            className="flex h-full w-full flex-col overflow-y-auto dark-modal p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Submit Application</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/60 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && <p className="mb-3 rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-400">{error}</p>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Type</label>
                <select value={fType} onChange={(e) => setFType(e.target.value)} className={inputClass}>
                  {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">From</label>
                  <input type="date" value={fStart} onChange={(e) => setFStart(e.target.value)} className={cn(inputClass, 'rounded-xl')} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">To</label>
                  <input type="date" value={fEnd} onChange={(e) => setFEnd(e.target.value)} className={cn(inputClass, 'rounded-xl')} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Reason</label>
                <textarea
                  value={fReason}
                  onChange={(e) => setFReason(e.target.value)}
                  rows={3}
                  placeholder="Explain what happened…"
                  className="min-h-[80px] w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none glass-input"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="mt-2 flex items-center justify-center gap-2 min-h-[48px] rounded-full bg-grad-blue crisp-on-dark px-6 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {saving ? 'Submitting…' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
