'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { formatPKTDueDate, isOverdueInPKT } from '@/lib/pkt'
import type { TaskStatus } from '@/types'

export type TaskWithClient = {
  id: string
  task_text: string
  due_date: string | null
  status: TaskStatus
  clients: { name: string } | { name: string }[] | null
}

type Tab = 'pending' | 'done' | 'snoozed'

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'done', label: 'Done' },
  { id: 'snoozed', label: 'Snoozed' },
]

function getClientName(clients: TaskWithClient['clients']): string {
  if (!clients) return 'Unknown client'
  if (Array.isArray(clients)) return clients[0]?.name ?? 'Unknown client'
  return clients.name
}

function getAccentColor(status: TaskStatus, dueDate: string | null): string {
  if (status === 'done') return '#2083B9'
  if (status === 'pending' && isOverdueInPKT(dueDate)) return '#E48328'
  return '#B7C733'
}

type Props = {
  tasks: TaskWithClient[]
}

export function TaskPanel({ tasks }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const filtered = tasks.filter((t) => t.status === activeTab)

  async function updateTask(
    taskId: string,
    status: TaskStatus,
    dueDate?: string
  ) {
    const body: Record<string, string> = { taskId, status }
    if (dueDate) body.due_date = dueDate

    const res = await fetch('/api/tasks/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      startTransition(() => router.refresh())
    }
  }

  return (
    <>
      <div className="mb-6 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
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
        <p className="text-text/60">No {activeTab} tasks.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const overdue =
              task.status === 'pending' && isOverdueInPKT(task.due_date)
            const dueLabel = formatPKTDueDate(task.due_date)
            const accent = getAccentColor(task.status, task.due_date)

            return (
              <div
                key={task.id}
                className="flex overflow-hidden rounded-2xl bg-bg"
              >
                <div
                  className="w-1.5 shrink-0"
                  style={{ backgroundColor: accent }}
                />
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <p className="font-bold text-text">{task.task_text}</p>
                    <p className="mt-1 text-sm text-blue">
                      {getClientName(task.clients)}
                    </p>
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

                  {task.status !== 'done' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => updateTask(task.id, 'done')}
                        className="rounded-full border border-text/20 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-text/40 disabled:opacity-50"
                      >
                        ✓ Mark Done
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          const due = new Date(
                            Date.now() + 24 * 60 * 60 * 1000
                          ).toISOString()
                          updateTask(task.id, 'snoozed', due)
                        }}
                        className="rounded-full border border-text/20 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-text/40 disabled:opacity-50"
                      >
                        ⏰ Snooze 24h
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
