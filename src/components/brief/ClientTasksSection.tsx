'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { BriefCard } from './BriefCard'
import { TaskDetailPanel } from '@/components/dashboard/TaskDetailPanel'
import { formatPKTDueDate, formatPKTRegistrationDate, isOverdueInPKT } from '@/lib/pkt'

export type ClientTaskAction = {
  id: string
  action_type: string
  note_text: string | null
  visibility: string | null
  created_at: string
  new_status: string | null
  old_status: string | null
  counselors: { name: string } | { name: string }[] | null
}

export type ClientTask = {
  id: string
  task_text: string
  due_date: string | null
  status: string
  notes_count: number | null
  negligence_flagged: boolean | null
  counselor_id: string | null
  counselors: { name: string } | { name: string }[] | null
  task_actions: ClientTaskAction[] | null
}

type Props = {
  clientId: string
  clientName: string
  currentStaffId: string
  tasks: ClientTask[]
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-orange/20 text-orange',
  in_progress: 'bg-blue/20 text-white',
  completed: 'bg-green/20 text-white',
  closed: 'bg-white/15 text-white/70',
}

function relationName(
  value: { name: string } | { name: string }[] | null | undefined,
  fallback = 'Staff'
): string {
  if (!value) return fallback
  if (Array.isArray(value)) return value[0]?.name ?? fallback
  return value.name
}

export function ClientTasksSection({
  clientId,
  clientName,
  currentStaffId,
  tasks,
}: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedId) ?? null,
    [tasks, selectedId]
  )

  return (
    <BriefCard>
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-white/60" />
        <h2 className="text-lg font-bold text-white">Tasks & staff notes</h2>
        {tasks.length > 0 && (
          <span className="rounded-full glass-card px-2 py-0.5 text-xs font-medium text-white/60">
            {tasks.length}
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-white/50">
          No tasks linked to this student yet. Notes added on a client task will appear here.
        </p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const overdue = task.status === 'open' && isOverdueInPKT(task.due_date)
            const notes = (task.task_actions ?? [])
              .filter((action) => action.action_type === 'note' && action.note_text)
              .sort((a, b) => a.created_at.localeCompare(b.created_at))

            return (
              <li key={task.id} className="rounded-xl glass-card px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          STATUS_COLORS[task.status] || STATUS_COLORS.open
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                      {task.negligence_flagged && (
                        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-white/90">{task.task_text}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {relationName(task.counselors)}
                      {task.due_date
                        ? ` · Due ${formatPKTDueDate(task.due_date)}${overdue ? ' · overdue' : ''}`
                        : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(task.id)}
                    className="min-h-[44px] shrink-0 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white"
                  >
                    Add note
                  </button>
                </div>

                {notes.length > 0 ? (
                  <ul className="mt-3 space-y-2 border-t border-white/10 pt-3">
                    {notes.map((note) => (
                      <li key={note.id}>
                        <p className="whitespace-pre-wrap text-sm text-white/80">{note.note_text}</p>
                        <p className="mt-0.5 text-[10px] text-white/40">
                          {relationName(note.counselors)} · {formatPKTRegistrationDate(note.created_at)}
                          {note.visibility === 'shared' ? ' · Shared with client' : ' · Internal'}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-white/40">No staff notes on this task yet.</p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {selectedTask && (
        <TaskDetailPanel
          task={{
            id: selectedTask.id,
            task_text: selectedTask.task_text,
            due_date: selectedTask.due_date ?? '',
            status: selectedTask.status,
            notes_count: selectedTask.notes_count ?? 0,
            negligence_flagged: selectedTask.negligence_flagged ?? false,
            clients: { name: clientName, id: clientId },
          }}
          counselorId={currentStaffId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => router.refresh()}
        />
      )}
    </BriefCard>
  )
}
