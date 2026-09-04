'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, Check, X, Plus, PauseCircle } from 'lucide-react'
import { BriefCard } from './BriefCard'
import type { Reminder, ReminderOutcome } from '@/types'

type Props = {
  clientId: string
}

function formatPKT(iso: string) {
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

const OUTCOME_LABELS: Record<ReminderOutcome, string> = {
  positive: 'Positive — moving forward',
  negative: 'Negative — not proceeding',
  neutral: 'Neutral / no response',
}

/** Standing profile widget for self-set follow-up reminders — the other of
 * the two entry points (alongside the task-completion prompt). Fully
 * manual and optional: nothing here fires on its own. */
export function RemindersSection({ clientId }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newAt, setNewAt] = useState('')
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<ReminderOutcome>('positive')
  const [outcomeNote, setOutcomeNote] = useState('')
  const [alsoCloseTask, setAlsoCloseTask] = useState(true)
  const [snoozeUntil, setSnoozeUntil] = useState<string | null>(null)
  const [snoozeReason, setSnoozeReason] = useState<string | null>(null)
  const [showSnooze, setShowSnooze] = useState(false)
  const [snoozeDate, setSnoozeDate] = useState('')
  const [snoozeReasonInput, setSnoozeReasonInput] = useState('')
  const [snoozeSaving, setSnoozeSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reminders?clientId=${clientId}`)
      const data = await res.json()
      if (res.ok) setReminders(data.reminders ?? [])
    } finally {
      setLoading(false)
    }
  }, [clientId])

  const loadSnooze = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/idle-snooze`)
      const data = await res.json()
      if (res.ok) {
        setSnoozeUntil(data.snoozeUntil)
        setSnoozeReason(data.reason)
      }
    } catch {
      // Non-fatal
    }
  }, [clientId])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void loadSnooze() }, [loadSnooze])

  async function saveSnooze() {
    if (!snoozeDate) return
    setSnoozeSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/idle-snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snoozeUntil: snoozeDate, reason: snoozeReasonInput || undefined }),
      })
      if (res.ok) {
        setShowSnooze(false)
        setSnoozeDate('')
        setSnoozeReasonInput('')
        await loadSnooze()
      }
    } finally {
      setSnoozeSaving(false)
    }
  }

  async function clearSnooze() {
    setSnoozeSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/idle-snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snoozeUntil: null }),
      })
      if (res.ok) await loadSnooze()
    } finally {
      setSnoozeSaving(false)
    }
  }

  async function addReminder() {
    if (!newAt) return
    setSaving(true)
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, remindAt: new Date(newAt).toISOString(), note: newNote || undefined }),
    })
    setSaving(false)
    if (res.ok) {
      setNewAt('')
      setNewNote('')
      setShowAdd(false)
      await load()
    }
  }

  function startResolve(r: Reminder) {
    setResolvingId(r.id)
    setOutcome('positive')
    setOutcomeNote('')
    setAlsoCloseTask(!!r.task_id)
  }

  async function submitResolve(reminderId: string, taskId: string | null) {
    setSaving(true)
    const res = await fetch(`/api/reminders/${reminderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome,
        outcomeNote: outcomeNote || undefined,
        alsoCloseTask: outcome === 'positive' && !!taskId ? alsoCloseTask : false,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setResolvingId(null)
      await load()
    }
  }

  const pending = reminders.filter((r) => r.status === 'pending')
  const resolved = reminders.filter((r) => r.status === 'resolved')

  return (
    <BriefCard>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-white/60" />
          <h2 className="text-base font-semibold text-white">Follow-up Reminders</h2>
          {pending.length > 0 && (
            <span className="rounded-full bg-blue/20 px-2 py-0.5 text-xs font-medium text-white">
              {pending.length} pending
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/60 hover:border-white/40 hover:text-white transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Set Reminder
        </button>
      </div>

      <div className="mt-3">
        {snoozeUntil ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange/30 bg-orange/10 px-3 py-2">
            <p className="text-xs text-orange">
              <PauseCircle className="mr-1 inline h-3.5 w-3.5" />
              Idle follow-up paused until {snoozeUntil}
              {snoozeReason ? ` — ${snoozeReason}` : ''}
            </p>
            <button
              type="button"
              disabled={snoozeSaving}
              onClick={clearSnooze}
              className="shrink-0 text-xs font-semibold text-orange/80 hover:text-orange disabled:opacity-50"
            >
              Resume
            </button>
          </div>
        ) : showSnooze ? (
          <div className="flex flex-col gap-2 rounded-xl border border-white/10 glass-card p-3 sm:flex-row">
            <input
              type="date"
              value={snoozeDate}
              onChange={(e) => setSnoozeDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="rounded-xl px-3 py-2 text-sm outline-none glass-input"
            />
            <input
              type="text"
              value={snoozeReasonInput}
              onChange={(e) => setSnoozeReasonInput(e.target.value)}
              placeholder="Reason (e.g. waiting on embassy)"
              className="flex-1 rounded-xl px-3 py-2 text-sm outline-none glass-input"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!snoozeDate || snoozeSaving}
                onClick={saveSnooze}
                className="shrink-0 rounded-full bg-grad-orange crisp-on-dark px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {snoozeSaving ? 'Saving…' : 'Pause'}
              </button>
              <button
                type="button"
                onClick={() => setShowSnooze(false)}
                className="shrink-0 rounded-full glass-card px-3 py-2 text-xs font-semibold text-white/60"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSnooze(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white/70 transition-colors"
          >
            <PauseCircle className="h-3.5 w-3.5" />
            Pause idle follow-up (waiting on a legitimate reason)
          </button>
        )}
      </div>

      {showAdd && (
        <div className="mt-4 rounded-xl border border-white/10 glass-card p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="datetime-local"
              value={newAt}
              onChange={(e) => setNewAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="flex-1 rounded-xl px-3 py-2 text-sm outline-none glass-input"
            />
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="What to follow up about (optional)"
              className="flex-[2] rounded-xl px-3 py-2 text-sm outline-none glass-input"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={!newAt || saving}
              onClick={addReminder}
              className="rounded-full bg-grad-blue crisp-on-dark px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Reminder'}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-full glass-card px-4 py-1.5 text-xs font-semibold text-white/60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-white/50">Loading reminders…</p>
      ) : reminders.length === 0 ? (
        <p className="mt-4 text-sm text-white/50">
          No follow-up reminders yet. Set one above — it'll also show up in your own Tasks list on that
          date — or from a task when you mark it Completed or Closed.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {pending.map((r) => (
            <div key={r.id} className="rounded-xl border border-blue/20 glass-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white/80">{formatPKT(r.remind_at)}</p>
                  {r.note && <p className="text-sm text-white/60">{r.note}</p>}
                  {r.task_id && (
                    <span className="mt-1 inline-block rounded-full glass-card px-2 py-0.5 text-[10px] font-semibold text-white/40">
                      Linked to a task
                    </span>
                  )}
                </div>
                {resolvingId !== r.id && (
                  <button
                    type="button"
                    onClick={() => startResolve(r)}
                    className="shrink-0 rounded-full bg-grad-blue crisp-on-dark px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Resolve
                  </button>
                )}
              </div>

              {resolvingId === r.id && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(OUTCOME_LABELS) as ReminderOutcome[]).map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setOutcome(o)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                          outcome === o
                            ? 'border-white/30 bg-white/20 text-white'
                            : 'border-white/10 glass-card text-white/50 hover:text-white'
                        }`}
                      >
                        {OUTCOME_LABELS[o]}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={outcomeNote}
                    onChange={(e) => setOutcomeNote(e.target.value)}
                    rows={2}
                    placeholder="Outcome note (what happened?)"
                    className="w-full resize-none rounded-xl px-3 py-2 text-sm outline-none glass-input"
                  />
                  {r.task_id && outcome === 'positive' && (
                    <label className="flex items-center gap-2 text-xs text-white/60">
                      <input
                        type="checkbox"
                        checked={alsoCloseTask}
                        onChange={(e) => setAlsoCloseTask(e.target.checked)}
                      />
                      Also close the linked task
                    </label>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => submitResolve(r.id, r.task_id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-grad-blue crisp-on-dark px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {saving ? 'Saving…' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setResolvingId(null)}
                      className="inline-flex items-center gap-1.5 rounded-full glass-card px-4 py-1.5 text-xs font-semibold text-white/60"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {resolved.length > 0 && (
            <div className="pt-2">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">Recently Resolved</p>
              <div className="space-y-2">
                {resolved.map((r) => (
                  <div key={r.id} className="rounded-xl glass-card px-3 py-2 text-sm text-white/60">
                    <span className="font-medium text-white/80">{formatPKT(r.remind_at)}</span>
                    {' — '}
                    {OUTCOME_LABELS[r.outcome ?? 'neutral']}
                    {r.outcome_note && <span className="text-white/50">: {r.outcome_note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </BriefCard>
  )
}
