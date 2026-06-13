'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type CounselorOption = { id: string; name: string }

type LeaveApplication = {
  id: string
  counselor_id: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string | null
  status: string
  review_note: string | null
  reviewed_at: string | null
  created_at: string
  counselors: { name: string } | null
}

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'emergency', label: 'Emergency Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'other', label: 'Other' },
]

const STATUS_FILTER = ['all', 'pending', 'approved', 'rejected'] as const

function statusBadge(status: string) {
  if (status === 'approved') return 'bg-green/20 text-text'
  if (status === 'rejected') return 'bg-red-100 text-red-600'
  return 'bg-orange/10 text-orange'
}

function dayCount(start: string, end: string) {
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  return Math.round(diff) + 1
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
}

const inputClass =
  'min-h-[44px] w-full rounded-full border border-text/20 bg-bg px-4 py-2 text-sm text-text outline-none focus:border-blue'
const selectClass = inputClass

export function HrLeavePanel({ counselors }: { counselors: CounselorOption[] }) {
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [applications, setApplications] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [reviewModal, setReviewModal] = useState<LeaveApplication | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Create form
  const [fCounselorId, setFCounselorId] = useState('')
  const [fLeaveType, setFLeaveType] = useState('annual')
  const [fStart, setFStart] = useState('')
  const [fEnd, setFEnd] = useState('')
  const [fReason, setFReason] = useState('')

  // Review form
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved')
  const [reviewNote, setReviewNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/admin/hr/leave${qs}`)
      const data = await res.json()
      if (res.ok) setApplications(data.applications ?? [])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!fCounselorId || !fStart || !fEnd) { setError('All fields are required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/hr/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counselorId: fCounselorId,
          leaveType: fLeaveType,
          startDate: fStart,
          endDate: fEnd,
          reason: fReason || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Submit failed'); return }
      setCreateOpen(false)
      load()
    } catch { setError('Something went wrong') }
    finally { setSaving(false) }
  }

  async function handleReview() {
    if (!reviewModal) return
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/admin/hr/leave/${reviewModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: reviewStatus, reviewNote: reviewNote || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Review failed'); return }
      setReviewModal(null)
      load()
    } catch { setError('Something went wrong') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-2xl border border-text/10 bg-white p-1 w-fit">
          {STATUS_FILTER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                'min-h-[36px] rounded-xl px-4 text-sm font-medium capitalize transition-colors',
                statusFilter === s ? 'bg-text text-bg' : 'text-text/60 hover:bg-text/5'
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setFCounselorId(counselors[0]?.id ?? ''); setFLeaveType('annual'); setFStart(''); setFEnd(''); setFReason(''); setError(''); setCreateOpen(true) }}
          className="flex items-center gap-1.5 min-h-[44px] rounded-full bg-text px-4 text-sm font-semibold text-bg w-fit"
        >
          <Plus className="h-4 w-4" />
          Submit Application
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-text/60">Loading…</p>
      ) : applications.length === 0 ? (
        <p className="mt-4 text-sm text-text/60">No {statusFilter !== 'all' ? statusFilter : ''} leave applications.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-text/10 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-text/10 text-text/50">
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Days</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const name = app.counselors?.name ?? counselors.find((c) => c.id === app.counselor_id)?.name ?? '—'
                const leaveLabel = LEAVE_TYPES.find((t) => t.value === app.leave_type)?.label ?? app.leave_type
                return (
                  <tr key={app.id} className="border-b border-text/5 last:border-0">
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3 text-text/70">{leaveLabel}</td>
                    <td className="px-4 py-3 text-text/70">{formatDate(app.start_date)} → {formatDate(app.end_date)}</td>
                    <td className="px-4 py-3 font-semibold">{dayCount(app.start_date, app.end_date)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold capitalize', statusBadge(app.status))}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text/60 text-xs">{formatDate(app.created_at)}</td>
                    <td className="px-4 py-3">
                      {app.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => { setReviewStatus('approved'); setReviewNote(''); setError(''); setReviewModal(app) }}
                          className="rounded-full border border-blue px-3 py-1.5 text-xs font-semibold text-blue"
                        >
                          Review
                        </button>
                      )}
                      {app.status !== 'pending' && app.review_note && (
                        <span className="text-xs text-text/40 italic">{app.review_note}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4" onClick={() => setCreateOpen(false)} role="presentation">
          <div className="flex h-full w-full flex-col overflow-y-auto bg-bg p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-[20px]" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-blue">Submit Leave Application</h2>
              <button type="button" onClick={() => setCreateOpen(false)} className="min-h-[44px] min-w-[44px] flex items-center justify-center"><X className="h-5 w-5" /></button>
            </div>
            {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-text/60 mb-1.5">Staff Member</label>
                <select value={fCounselorId} onChange={(e) => setFCounselorId(e.target.value)} className={selectClass}>
                  {counselors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text/60 mb-1.5">Leave Type</label>
                <select value={fLeaveType} onChange={(e) => setFLeaveType(e.target.value)} className={selectClass}>
                  {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text/60 mb-1.5">From</label>
                  <input type="date" value={fStart} onChange={(e) => setFStart(e.target.value)} className={cn(inputClass, 'rounded-xl')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text/60 mb-1.5">To</label>
                  <input type="date" value={fEnd} onChange={(e) => setFEnd(e.target.value)} className={cn(inputClass, 'rounded-xl')} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text/60 mb-1.5">Reason</label>
                <textarea value={fReason} onChange={(e) => setFReason(e.target.value)} rows={3} placeholder="Reason for leave…" className="min-h-[80px] w-full rounded-2xl border border-text/20 bg-bg px-4 py-3 text-sm text-text outline-none focus:border-blue resize-none" />
              </div>
            </div>
            <button type="button" onClick={handleCreate} disabled={saving} className="mt-6 flex items-center justify-center gap-2 min-h-[48px] rounded-full bg-text px-6 text-sm font-semibold text-bg disabled:opacity-50">
              <Check className="h-4 w-4" />
              {saving ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4" onClick={() => setReviewModal(null)} role="presentation">
          <div className="flex h-full w-full flex-col overflow-y-auto bg-bg p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-[20px]" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-blue">Review Application</h2>
              <button type="button" onClick={() => setReviewModal(null)} className="min-h-[44px] min-w-[44px] flex items-center justify-center"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-4 rounded-2xl bg-white p-4 text-sm">
              <p className="font-semibold">{reviewModal.counselors?.name}</p>
              <p className="text-text/60 mt-1">{LEAVE_TYPES.find((t) => t.value === reviewModal.leave_type)?.label} · {dayCount(reviewModal.start_date, reviewModal.end_date)} days</p>
              <p className="text-text/60">{formatDate(reviewModal.start_date)} → {formatDate(reviewModal.end_date)}</p>
              {reviewModal.reason && <p className="mt-2 text-text/80 italic">"{reviewModal.reason}"</p>}
            </div>
            {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 mb-4">
              <button type="button" onClick={() => setReviewStatus('approved')} className={cn('flex-1 min-h-[44px] rounded-full text-sm font-semibold transition-colors', reviewStatus === 'approved' ? 'bg-green text-text' : 'border border-text/20 text-text/60')}>Approve</button>
              <button type="button" onClick={() => setReviewStatus('rejected')} className={cn('flex-1 min-h-[44px] rounded-full text-sm font-semibold transition-colors', reviewStatus === 'rejected' ? 'bg-red-100 text-red-600' : 'border border-text/20 text-text/60')}>Reject</button>
            </div>
            <div>
              <label className="block text-xs font-medium text-text/60 mb-1.5">Note (optional)</label>
              <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={2} placeholder="Optional note to staff member…" className="w-full rounded-2xl border border-text/20 bg-bg px-4 py-3 text-sm text-text outline-none focus:border-blue resize-none" />
            </div>
            <button type="button" onClick={handleReview} disabled={saving} className="mt-4 flex items-center justify-center gap-2 min-h-[48px] rounded-full bg-text px-6 text-sm font-semibold text-bg disabled:opacity-50">
              {saving ? 'Saving…' : `Confirm ${reviewStatus === 'approved' ? 'Approval' : 'Rejection'}`}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
