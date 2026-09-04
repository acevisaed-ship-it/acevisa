'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { formatPKTDueDate, isOverdueInPKT } from '@/lib/pkt'
import { computeTaskUrgency, URGENCY_LABELS, URGENCY_BADGE_CLASS } from '@/lib/taskUrgency'

export type TaskWithClient = {
  id: string
  task_text: string
  due_date: string | null
  status: string
  notes_count?: number
  negligence_flagged?: boolean
  is_milestone?: boolean | null
  clients: { name: string; id?: string } | { name: string; id?: string }[] | null
}

type Tab = 'open' | 'in_progress' | 'completed' | 'closed'

const TABS: { id: Tab; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'closed', label: 'Closed' },
]

function getClientName(clients: TaskWithClient['clients']): string {
  if (!clients) return 'Not linked to a student'
  if (Array.isArray(clients)) return clients[0]?.name ?? 'Not linked to a student'
  return clients.name
}

function getClientId(clients: TaskWithClient['clients']): string | undefined {
  if (!clients) return undefined
  if (Array.isArray(clients)) return clients[0]?.id
  return clients.id
}

function getAccentColor(status: string, dueDate: string | null): string {
  if (status === 'completed' || status === 'closed') return '#2083B9'
  if (status === 'in_progress') return '#2083B9'
  if (status === 'open' && isOverdueInPKT(dueDate)) return '#E48328'
  return '#B7C733'
}

type Props = {
  tasks: TaskWithClient[]
  onTaskClick: (task: TaskWithClient) => void
  // Counselor pages live under /dashboard, admin pages viewing a counselor's
  // tasks (or an admin's own "My Tasks") live under /admin — the client
  // profile link has to land in whichever section is currently active.
  clientProfileBasePath?: string
}

export function TaskPanel({ tasks, onTaskClick, clientProfileBasePath = '/dashboard/clients' }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('open')
  const [search, setSearch] = useState('')

  const byStatus = tasks.filter((t) => t.status === activeTab)
  const query = search.trim().toLowerCase()
  const filtered = query
    ? byStatus.filter((t) => getClientName(t.clients).toLowerCase().includes(query))
    : byStatus

  return (
    <>
      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks by student name…"
          className="min-h-[44px] w-full max-w-sm rounded-full px-4 py-2.5 text-sm outline-none glass-input"
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[44px] rounded-full px-2 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'tab-btn-active'
                : 'tab-btn-inactive'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-white/50">
          {query
            ? `No ${activeTab.replace('_', ' ')} tasks match "${search}".`
            : `No ${activeTab.replace('_', ' ')} tasks.`}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const overdue = task.status === 'open' && isOverdueInPKT(task.due_date)
            const dueLabel = formatPKTDueDate(task.due_date)
            const accent = getAccentColor(task.status, task.due_date)
            const clientId = getClientId(task.clients)
            const urgency =
              task.status === 'open' || task.status === 'in_progress'
                ? computeTaskUrgency({ dueDate: task.due_date, isMilestone: task.is_milestone })
                : null

            return (
              <div
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => onTaskClick(task)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onTaskClick(task)
                  }
                }}
                className={`flex cursor-pointer overflow-hidden rounded-2xl glass-card crisp-on-dark transition-opacity hover:opacity-90 ${
                  task.negligence_flagged ? 'border-l-4 border-red-400' : ''
                }`}
              >
                <div
                  className="w-1.5 shrink-0"
                  style={{ backgroundColor: accent }}
                />
                <div className="flex flex-1 items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="font-bold text-white">{task.task_text}</p>
                      {(task.notes_count ?? 0) > 0 && (
                        <span className="shrink-0 rounded-full glass-card px-2 py-0.5 text-xs font-semibold text-white/50">
                          💬 {task.notes_count}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {clientId ? (
                        <Link
                          href={`${clientProfileBasePath}/${clientId}`}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="inline-flex items-center rounded-full bg-blue/20 px-2.5 py-1 text-xs font-semibold text-blue transition-colors hover:bg-blue/30"
                        >
                          {getClientName(task.clients)}
                        </Link>
                      ) : (
                        <span className="text-sm text-blue">{getClientName(task.clients)}</span>
                      )}
                      {dueLabel && overdue && (
                        <span className="inline-flex items-center rounded-full border border-red-400/40 bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-300">
                          Due {dueLabel} · overdue
                        </span>
                      )}
                      {urgency && (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${URGENCY_BADGE_CLASS[urgency]}`}
                        >
                          {URGENCY_LABELS[urgency]}
                        </span>
                      )}
                    </div>
                    {dueLabel && !overdue && (
                      <p className="mt-1 text-sm text-white/50">Due {dueLabel}</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
