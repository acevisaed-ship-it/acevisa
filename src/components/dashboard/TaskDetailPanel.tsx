'use client'

import { useState, useEffect } from 'react'
import { X, Clock, CheckCircle, MessageSquare, Bell } from 'lucide-react'

interface TaskAction {
  id: string
  action_type: string
  note_text?: string
  old_status?: string
  new_status?: string
  reminder_at?: string
  visibility?: string
  created_at: string
  counselors?: { name: string }
}

interface Task {
  id: string
  task_text: string
  due_date: string
  status: string
  notes_count: number
  negligence_flagged: boolean
  clients?: { name: string; id?: string }
}

interface Props {
  task: Task
  counselorId: string
  readOnly?: boolean
  onClose: () => void
  onUpdated: () => void
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange/20 text-orange',
  in_progress: 'bg-blue/20 text-white',
  done: 'bg-green/20 text-white',
}

export function TaskDetailPanel({
  task,
  counselorId,
  readOnly = false,
  onClose,
  onUpdated,
}: Props) {
  const [actions, setActions] = useState<TaskAction[]>([])
  const [note, setNote] = useState('')
  const [noteVisibility, setNoteVisibility] = useState<'internal' | 'shared'>('internal')
  const [reminderInput, setReminderInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<'update' | 'history'>(readOnly ? 'history' : 'update')

  useEffect(() => {
    fetch(`/api/tasks/${task.id}/actions`)
      .then((r) => r.json())
      .then((d) => setActions(d.actions || []))
  }, [task.id])

  const submitAction = async (actionType: string, newStatus?: string) => {
    if (actionType === 'note' && !note.trim()) return
    setSubmitting(true)
    await fetch(`/api/tasks/${task.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        counselorId,
        actionType,
        noteText: note || undefined,
        newStatus: newStatus || undefined,
        reminderAt: reminderInput || undefined,
        visibility: noteVisibility,
      }),
    })
    setNote('')
    setReminderInput('')
    setSubmitting(false)
    onUpdated()
    fetch(`/api/tasks/${task.id}/actions`)
      .then((r) => r.json())
      .then((d) => setActions(d.actions || []))
  }

  const formatPKT = (iso: string) => {
    const d = new Date(new Date(iso).getTime() + 5 * 60 * 60 * 1000)
    return (
      d.toLocaleString('en-PK', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' PKT'
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-0 sm:items-center sm:px-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl dark-modal shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[task.status] || STATUS_COLORS.pending}`}
              >
                {task.status.replace('_', ' ').toUpperCase()}
              </span>
              {task.negligence_flagged && (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400">
                  ⚠ OVERDUE
                </span>
              )}
            </div>
            <p className="mt-2 text-sm font-semibold leading-snug text-white">{task.task_text}</p>
            <div className="mt-1 flex items-center gap-3 text-xs text-white/50">
              {task.clients?.name && <span>👤 {task.clients.name}</span>}
              <span>Due: {formatPKT(task.due_date)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 rounded-full p-1.5 transition-colors hover:bg-white/10 text-white/60 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-white/10">
          {(readOnly ? (['history'] as const) : (['update', 'history'] as const)).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === t
                  ? 'border-b-2 border-green text-white'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {t === 'update' ? 'Update Task' : `History (${actions.length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {readOnly && (
            <p className="rounded-xl bg-orange/10 px-3 py-2 text-sm text-white/60">
              Admin view — task updates are read-only.
            </p>
          )}
          {tab === 'update' && !readOnly && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
                  Add a Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What did you do? What was discussed? Any update on this task…"
                  rows={3}
                  className="w-full resize-none rounded-xl px-3 py-2 text-sm outline-none glass-input"
                />
                {/* Visibility toggle */}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNoteVisibility('internal')}
                    className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      noteVisibility === 'internal'
                        ? 'border-white/30 bg-white/20 text-white'
                        : 'border-white/10 glass-card text-white/50 hover:text-white'
                    }`}
                  >
                    🔒 Internal only
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteVisibility('shared')}
                    className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      noteVisibility === 'shared'
                        ? 'border-green bg-green text-[#0A3F3A]'
                        : 'border-white/10 glass-card text-white/50 hover:text-white'
                    }`}
                  >
                    👁 Share with client
                  </button>
                </div>

                <button
                  onClick={() => submitAction('note')}
                  disabled={!note.trim() || submitting}
                  className="mt-2 flex items-center gap-2 rounded-full bg-grad-blue crisp-on-dark px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <MessageSquare size={14} />
                  Save Note
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
                  Set Reminder
                </label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={reminderInput}
                    onChange={(e) => setReminderInput(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="flex-1 rounded-xl px-3 py-2 text-sm outline-none glass-input"
                  />
                  <button
                    onClick={() => submitAction('reminder_set')}
                    disabled={!reminderInput || submitting}
                    className="flex items-center gap-1.5 rounded-full bg-grad-blue crisp-on-dark px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    <Bell size={14} />
                    Set
                  </button>
                </div>
                <p className="mt-1 text-xs text-white/40">
                  You&apos;ll receive a notification at this time.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
                  Update Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {task.status !== 'in_progress' && (
                    <button
                      onClick={() => submitAction('status_update', 'in_progress')}
                      disabled={submitting}
                      className="flex items-center gap-1.5 rounded-full border border-blue/40 px-3 py-1.5 text-sm font-semibold text-white/70 transition-colors hover:bg-blue/20 hover:text-white"
                    >
                      <Clock size={14} />
                      Mark In Progress
                    </button>
                  )}
                  {task.status !== 'done' && (
                    <button
                      onClick={() => submitAction('status_update', 'done')}
                      disabled={submitting}
                      className="flex items-center gap-1.5 rounded-full border border-green/40 px-3 py-1.5 text-sm font-semibold text-white/70 transition-colors hover:bg-green/20 hover:text-white"
                    >
                      <CheckCircle size={14} />
                      Mark Done
                    </button>
                  )}
                  {task.status !== 'pending' && (
                    <button
                      onClick={() => submitAction('status_update', 'pending')}
                      disabled={submitting}
                      className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-sm font-semibold text-white/50 transition-colors hover:text-white"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {tab === 'history' && (
            <div className="space-y-3">
              {actions.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/40">
                  No actions recorded yet. Add a note or update the status to start the history.
                </p>
              ) : (
                actions.map((action, i) => (
                  <div key={action.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          action.action_type === 'negligence_flag'
                            ? 'bg-red-400'
                            : action.action_type === 'status_update'
                              ? 'bg-green'
                              : action.action_type === 'reminder_set'
                                ? 'bg-blue'
                                : 'bg-orange'
                        }`}
                      />
                      {i < actions.length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-white/10" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-4">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-xs font-bold text-white/80">
                          {action.counselors?.name || 'System'}
                        </span>
                        <span className="text-[10px] text-white/40">
                          {new Date(action.created_at).toLocaleString('en-PK', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {action.action_type === 'note' && (
                        <div className="mt-0.5">
                          <p className="rounded-xl glass-card px-3 py-2 text-sm text-white/70">
                            {action.note_text}
                          </p>
                          {action.visibility === 'shared' ? (
                            <span className="mt-1 inline-block rounded-full bg-green/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                              👁 Shared with client
                            </span>
                          ) : (
                            <span className="mt-1 inline-block rounded-full glass-card px-2 py-0.5 text-[10px] font-semibold text-white/40">
                              🔒 Internal
                            </span>
                          )}
                        </div>
                      )}
                      {action.action_type === 'status_update' && (
                        <p className="mt-0.5 text-sm text-white/50">
                          Status changed:{' '}
                          <span className="font-semibold">{action.old_status}</span>
                          {' → '}
                          <span className="font-semibold text-white/80">{action.new_status}</span>
                        </p>
                      )}
                      {action.action_type === 'reminder_set' && (
                        <p className="mt-0.5 text-sm text-blue">
                          🔔 Reminder set for{' '}
                          {action.reminder_at
                            ? new Date(
                                new Date(action.reminder_at).getTime() + 5 * 60 * 60 * 1000
                              ).toLocaleString('en-PK')
                            : '—'}
                        </p>
                      )}
                      {action.action_type === 'negligence_flag' && (
                        <p className="mt-0.5 text-sm font-semibold text-red-400">
                          ⚠ {action.note_text}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
              <p className="pt-2 text-center text-[10px] text-white/30">
                All entries are permanent and cannot be edited or deleted.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
