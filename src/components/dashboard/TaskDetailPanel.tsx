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
  onClose: () => void
  onUpdated: () => void
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-[#E48328]/20 text-[#E48328]',
  in_progress: 'bg-[#2083B9]/20 text-[#2083B9]',
  done: 'bg-[#B7C733]/30 text-[#0A3F3A]',
}

export function TaskDetailPanel({ task, counselorId, onClose, onUpdated }: Props) {
  const [actions, setActions] = useState<TaskAction[]>([])
  const [note, setNote] = useState('')
  const [reminderInput, setReminderInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<'update' | 'history'>('update')

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
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-[#0A3F3A]/10 p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[task.status] || STATUS_COLORS.pending}`}
              >
                {task.status.replace('_', ' ').toUpperCase()}
              </span>
              {task.negligence_flagged && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                  ⚠ OVERDUE
                </span>
              )}
            </div>
            <p className="mt-2 text-sm font-semibold leading-snug text-[#0A3F3A]">{task.task_text}</p>
            <div className="mt-1 flex items-center gap-3 text-xs text-[#0A3F3A]/50">
              {task.clients?.name && <span>👤 {task.clients.name}</span>}
              <span>Due: {formatPKT(task.due_date)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 rounded-full p-1.5 transition-colors hover:bg-[#E6E8E7]"
          >
            <X size={18} className="text-[#0A3F3A]" />
          </button>
        </div>

        <div className="flex border-b border-[#0A3F3A]/10">
          {(['update', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === t
                  ? 'border-b-2 border-[#B7C733] text-[#0A3F3A]'
                  : 'text-[#0A3F3A]/50 hover:text-[#0A3F3A]'
              }`}
            >
              {t === 'update' ? 'Update Task' : `History (${actions.length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {tab === 'update' && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0A3F3A]/70">
                  Add a Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What did you do? What was discussed? Any update on this task…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[#0A3F3A]/20 bg-[#E6E8E7] px-3 py-2 text-sm text-[#0A3F3A] placeholder:text-[#0A3F3A]/40 focus:outline-none focus:ring-2 focus:ring-[#B7C733]"
                />
                <button
                  onClick={() => submitAction('note')}
                  disabled={!note.trim() || submitting}
                  className="mt-2 flex items-center gap-2 rounded-full bg-[#B7C733] px-4 py-2 text-sm font-bold text-[#0A3F3A] transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <MessageSquare size={14} />
                  Save Note
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0A3F3A]/70">
                  Set Reminder
                </label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={reminderInput}
                    onChange={(e) => setReminderInput(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="flex-1 rounded-xl border border-[#0A3F3A]/20 bg-[#E6E8E7] px-3 py-2 text-sm text-[#0A3F3A] focus:outline-none focus:ring-2 focus:ring-[#B7C733]"
                  />
                  <button
                    onClick={() => submitAction('reminder_set')}
                    disabled={!reminderInput || submitting}
                    className="flex items-center gap-1.5 rounded-full bg-[#2083B9] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    <Bell size={14} />
                    Set
                  </button>
                </div>
                <p className="mt-1 text-xs text-[#0A3F3A]/40">
                  You&apos;ll receive a notification at this time.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0A3F3A]/70">
                  Update Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {task.status !== 'in_progress' && (
                    <button
                      onClick={() => submitAction('status_update', 'in_progress')}
                      disabled={submitting}
                      className="flex items-center gap-1.5 rounded-full border border-[#2083B9] px-3 py-1.5 text-sm font-semibold text-[#2083B9] transition-colors hover:bg-[#2083B9]/10"
                    >
                      <Clock size={14} />
                      Mark In Progress
                    </button>
                  )}
                  {task.status !== 'done' && (
                    <button
                      onClick={() => submitAction('status_update', 'done')}
                      disabled={submitting}
                      className="flex items-center gap-1.5 rounded-full border border-[#B7C733] px-3 py-1.5 text-sm font-semibold text-[#0A3F3A] transition-colors hover:bg-[#B7C733]/20"
                    >
                      <CheckCircle size={14} />
                      Mark Done
                    </button>
                  )}
                  {task.status !== 'pending' && (
                    <button
                      onClick={() => submitAction('status_update', 'pending')}
                      disabled={submitting}
                      className="flex items-center gap-1.5 rounded-full border border-[#0A3F3A]/30 px-3 py-1.5 text-sm font-semibold text-[#0A3F3A]/60 transition-colors hover:bg-[#0A3F3A]/5"
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
                <p className="py-8 text-center text-sm text-[#0A3F3A]/40">
                  No actions recorded yet. Add a note or update the status to start the history.
                </p>
              ) : (
                actions.map((action, i) => (
                  <div key={action.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          action.action_type === 'negligence_flag'
                            ? 'bg-red-500'
                            : action.action_type === 'status_update'
                              ? 'bg-[#B7C733]'
                              : action.action_type === 'reminder_set'
                                ? 'bg-[#2083B9]'
                                : 'bg-[#E48328]'
                        }`}
                      />
                      {i < actions.length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-[#0A3F3A]/10" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-4">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-xs font-bold text-[#0A3F3A]">
                          {action.counselors?.name || 'System'}
                        </span>
                        <span className="text-[10px] text-[#0A3F3A]/40">
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
                        <p className="mt-0.5 rounded-xl bg-[#E6E8E7] px-3 py-2 text-sm text-[#0A3F3A]/80">
                          {action.note_text}
                        </p>
                      )}
                      {action.action_type === 'status_update' && (
                        <p className="mt-0.5 text-sm text-[#0A3F3A]/60">
                          Status changed:{' '}
                          <span className="font-semibold">{action.old_status}</span>
                          {' → '}
                          <span className="font-semibold text-[#0A3F3A]">{action.new_status}</span>
                        </p>
                      )}
                      {action.action_type === 'reminder_set' && (
                        <p className="mt-0.5 text-sm text-[#2083B9]">
                          🔔 Reminder set for{' '}
                          {action.reminder_at
                            ? new Date(
                                new Date(action.reminder_at).getTime() + 5 * 60 * 60 * 1000
                              ).toLocaleString('en-PK')
                            : '—'}
                        </p>
                      )}
                      {action.action_type === 'negligence_flag' && (
                        <p className="mt-0.5 text-sm font-semibold text-red-600">
                          ⚠ {action.note_text}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
              <p className="pt-2 text-center text-[10px] text-[#0A3F3A]/30">
                All entries are permanent and cannot be edited or deleted.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
