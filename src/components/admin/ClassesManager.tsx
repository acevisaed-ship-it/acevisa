'use client'

import { useEffect, useState } from 'react'

type ClassRow = {
  id: string
  branchId: string
  branchName: string
  name: string
  subject: string | null
  instructorName: string | null
  scheduleDays: string[]
  scheduleTime: string | null
  isActive: boolean
  enrolledCount: number
}

type BranchOption = { id: string; name: string }

const inputCls = 'min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input'
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type Props = {
  isCeo: boolean
  defaultBranchId: string | null
}

export function ClassesManager({ isCeo, defaultBranchId }: Props) {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [branchFilter, setBranchFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    subject: '',
    instructorName: '',
    scheduleTime: '',
    branchId: defaultBranchId ?? '',
  })
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    const params = new URLSearchParams({ status: statusFilter })
    if (isCeo && branchFilter !== 'all') params.set('branchId', branchFilter)
    fetch(`/api/admin/classes?${params}`)
      .then((r) => r.json())
      .then((d) => setClasses(d.classes ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, branchFilter])

  useEffect(() => {
    if (!isCeo) return
    fetch('/api/admin/branches')
      .then((r) => r.json())
      .then((d) => setBranches((d.branches ?? []).map((b: { id: string; name: string }) => ({ id: b.id, name: b.name }))))
  }, [isCeo])

  function toggleDay(day: string) {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (isCeo && !form.branchId) {
      setError('Pick a branch for this class')
      return
    }
    setCreating(true)
    const res = await fetch('/api/admin/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, scheduleDays: selectedDays }),
    })
    const data = await res.json()
    setCreating(false)

    if (!res.ok) {
      setError(data.error || 'Failed to create class')
      return
    }

    setForm({ name: '', subject: '', instructorName: '', scheduleTime: '', branchId: defaultBranchId ?? '' })
    setSelectedDays([])
    load()
  }

  async function toggleActive(cls: ClassRow) {
    setBusyId(cls.id)
    try {
      await fetch(`/api/admin/classes/${cls.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !cls.isActive }),
      })
      load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">All Classes</h2>
          <div className="flex flex-wrap gap-2">
            {isCeo && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="min-h-[36px] rounded-full border border-white/15 bg-transparent px-3 text-xs text-white/70 outline-none"
              >
                <option value="all">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            {(['active', 'inactive', 'all'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`min-h-[36px] rounded-full px-4 text-xs font-semibold capitalize ${
                  statusFilter === s
                    ? 'bg-grad-green text-text'
                    : 'border border-white/15 text-white/60 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-white/40">Loading…</p>
        ) : classes.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">No {statusFilter === 'all' ? '' : statusFilter} classes yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classes.map((c) => (
              <article key={c.id} className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-white">{c.name}</h3>
                  {!c.isActive && (
                    <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/50">
                      Inactive
                    </span>
                  )}
                </div>
                {c.subject && <p className="mt-0.5 text-xs font-medium text-orange">{c.subject}</p>}
                {isCeo && <p className="mt-1 text-xs text-white/40">{c.branchName}</p>}
                {c.instructorName && <p className="mt-2 text-sm text-white/60">Instructor: {c.instructorName}</p>}
                {(c.scheduleDays.length > 0 || c.scheduleTime) && (
                  <p className="mt-1 text-sm text-white/60">
                    {c.scheduleDays.join(', ')}{c.scheduleDays.length > 0 && c.scheduleTime ? ' · ' : ''}{c.scheduleTime}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm font-medium text-white/70">{c.enrolledCount} enrolled</p>
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => toggleActive(c)}
                    className="text-xs text-white/50 hover:text-white disabled:opacity-50"
                  >
                    {busyId === c.id ? '…' : c.isActive ? 'Archive' : 'Reactivate'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold text-white">Add New Class</h2>
        <form onSubmit={handleCreate} className="mt-4 max-w-xl space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">Class name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
              placeholder="IELTS Evening Batch A"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Subject (optional)</label>
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className={inputCls}
                placeholder="IELTS"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Instructor (optional)</label>
              <input
                value={form.instructorName}
                onChange={(e) => setForm({ ...form, instructorName: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          {isCeo && (
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Branch</label>
              <select
                required
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                className={inputCls}
              >
                <option value="">Select a branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">Days (optional)</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`min-h-[36px] rounded-full px-3 text-xs font-semibold ${
                    selectedDays.includes(day)
                      ? 'bg-grad-green text-text'
                      : 'border border-white/15 text-white/60 hover:text-white'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">Time (optional)</label>
            <input
              value={form.scheduleTime}
              onChange={(e) => setForm({ ...form, scheduleTime: e.target.value })}
              className={inputCls}
              placeholder="6:00 PM - 8:00 PM"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/20 px-4 py-2.5 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={creating}
            className="min-h-[44px] w-full rounded-full bg-grad-blue crisp-on-dark px-6 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {creating ? 'Creating…' : 'Create class'}
          </button>
        </form>
      </div>
    </div>
  )
}
