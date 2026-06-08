'use client'

import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { formatPKTDueDate, isOverdueInPKT } from '@/lib/pkt'

export type TaskWithClient = {
  id: string
  task_text: string
  due_date: string | null
  status: string
  notes_count?: number
  negligence_flagged?: boolean
  clients: { name: string; id?: string } | { name: string; id?: string }[] | null
}

type Tab = 'pending' | 'in_progress' | 'done'

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
]

function getClientName(clients: TaskWithClient['clients']): string {
  if (!clients) return 'Unknown client'
  if (Array.isArray(clients)) return clients[0]?.name ?? 'Unknown client'
  return clients.name
}

function getAccentColor(status: string, dueDate: string | null): string {
  if (status === 'done') return '#2083B9'
  if (status === 'in_progress') return '#2083B9'
  if (status === 'pending' && isOverdueInPKT(dueDate)) return '#E48328'
  return '#B7C733'
}

type Props = {
  tasks: TaskWithClient[]
  onTaskClick: (task: TaskWithClient) => void
}

export function TaskPanel({ tasks, onTaskClick }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('pending')

  const filtered = tasks.filter((t) => t.status === activeTab)

  return (
    <>
      <div className="mb-6 grid grid-cols-3 gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[44px] rounded-full px-2 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-text text-white'
                : 'bg-white text-text/70 hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-text/60">No {activeTab.replace('_', ' ')} tasks.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const overdue = task.status === 'pending' && isOverdueInPKT(task.due_date)
            const dueLabel = formatPKTDueDate(task.due_date)
            const accent = getAccentColor(task.status, task.due_date)

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
                className={`flex cursor-pointer overflow-hidden rounded-2xl bg-bg transition-opacity hover:opacity-90 ${
                  task.negligence_flagged ? 'border-l-4 border-red-500' : ''
                }`}
              >
                <div
                  className="w-1.5 shrink-0"
                  style={{ backgroundColor: accent }}
                />
                <div className="flex flex-1 items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="font-bold text-text">{task.task_text}</p>
                      {(task.notes_count ?? 0) > 0 && (
                        <span className="shrink-0 rounded-full bg-[#E6E8E7] px-2 py-0.5 text-xs font-semibold text-[#0A3F3A]/70">
                          💬 {task.notes_count}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-blue">{getClientName(task.clients)}</p>
                    {dueLabel && (
                      <p
                        className={`mt-1 text-sm ${
                          overdue ? 'text-red-600' : 'text-text/60'
                        }`}
                      >
                        Due {dueLabel}
                        {overdue ? ' · overdue' : ''}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-text/40" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
