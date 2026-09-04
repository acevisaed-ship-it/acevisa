'use client'

import { useState } from 'react'
import { Clock, Loader2, Save } from 'lucide-react'

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

// Set from the DB as "HH:MM:SS" (Postgres `time`) — <input type="time">
// wants "HH:MM".
function toInputTime(value: string): string {
  return value?.slice(0, 5) || '09:00'
}

export function CounselorShiftEditor({
  counselorId,
  initialShiftStart,
  initialShiftEnd,
  initialWorkingDays,
}: {
  counselorId: string
  initialShiftStart: string
  initialShiftEnd: string
  initialWorkingDays: number[]
}) {
  const [start, setStart] = useState(toInputTime(initialShiftStart))
  const [end, setEnd] = useState(toInputTime(initialShiftEnd))
  const [days, setDays] = useState<number[]>(initialWorkingDays)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function toggleDay(d: number) {
    setSaved(false)
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b)))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/counselors/${counselorId}/shift`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftStartTime: start, shiftEndTime: end, workingDays: days }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-white/40" />
        <h3 className="text-sm font-semibold text-white">Attendance shift</h3>
      </div>
      <p className="mt-1 text-xs text-white/50">
        Expected start/end time and scheduled working days for this counselor. Lateness (with a
        15-minute grace period) and absence checks are based on this instead of one shared agency time.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-xs font-medium text-white/50">
          Shift start
          <input
            type="time"
            value={start}
            onChange={(e) => { setStart(e.target.value); setSaved(false) }}
            className="mt-1 w-full rounded-xl glass-input px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-white/50">
          Shift end
          <input
            type="time"
            value={end}
            onChange={(e) => { setEnd(e.target.value); setSaved(false) }}
            className="mt-1 w-full rounded-xl glass-input px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-white/50">Working days</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DAYS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDay(d.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                days.includes(d.value)
                  ? 'bg-grad-blue text-white'
                  : 'glass-card text-white/40 hover:text-white/70'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving || days.length === 0}
        className="mt-4 flex items-center gap-2 rounded-full bg-grad-green crisp-on-dark px-4 py-2 text-xs font-bold text-text disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        {saved ? 'Saved' : saving ? 'Saving…' : 'Save shift'}
      </button>
    </div>
  )
}
