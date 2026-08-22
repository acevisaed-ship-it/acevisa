'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown, SquareCheck } from 'lucide-react'
import { formatPKTDueDate, formatPKTTime, isOverdueInPKT } from '@/lib/pkt'

type Task = {
  id: string
  task_text: string
  due_date?: string | null
  completed_at?: string | null
}

type Props = {
  tasks: Task[]
  tasksHref?: string
  title?: string
  emptyLabel?: string
  /** 'due' shows the due date (+ overdue flag); 'completed' shows when it was finished. */
  mode?: 'due' | 'completed'
}

export function CollapsableTasksCard({
  tasks,
  tasksHref = '/dashboard/tasks',
  title = 'Open tasks',
  emptyLabel = 'All clear — no pending tasks.',
  mode = 'due',
}: Props) {
  const [open, setOpen] = useState(true)

  if (tasks.length === 0) {
    return (
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-white">{title}</h2>
        <p className="text-white/50">{emptyLabel}</p>
      </section>
    )
  }

  return (
    <section className="mb-10">
      <div className="overflow-hidden rounded-2xl border border-white/10 glass-card crisp-on-dark">
        {/* Header — always visible */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white">{title}</h2>
            <span className="rounded-full bg-orange/20 px-2.5 py-0.5 text-xs font-semibold text-orange">
              {tasks.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={tasksHref}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-white/50 hover:text-white"
            >
              View all
            </Link>
            <ChevronDown
              className={`h-4 w-4 text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* Collapsable body */}
        {open && (
          <div className="divide-y divide-white/5 border-t border-white/10">
            {tasks.slice(0, 5).map((task) => {
              const overdue = mode === 'due' && isOverdueInPKT(task.due_date ?? null)
              const dueLabel = mode === 'due' ? formatPKTDueDate(task.due_date ?? null) : null
              const completedLabel =
                mode === 'completed' && task.completed_at ? formatPKTTime(task.completed_at) : null
              return (
                <div key={task.id} className="flex items-start gap-3 px-5 py-3.5">
                  <SquareCheck className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white">{task.task_text}</p>
                    {dueLabel && (
                      <p className={`mt-0.5 text-xs ${overdue ? 'text-orange' : 'text-white/50'}`}>
                        Due {dueLabel}{overdue ? ' · overdue' : ''}
                      </p>
                    )}
                    {completedLabel && (
                      <p className="mt-0.5 text-xs text-white/50">Completed {completedLabel}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
