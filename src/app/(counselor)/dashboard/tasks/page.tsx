'use client'

import { useCallback, useEffect, useState } from 'react'
import { TaskDetailPanel } from '@/components/dashboard/TaskDetailPanel'
import { TaskPanel, type TaskWithClient } from './TaskPanel'

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithClient[]>([])
  const [counselorId, setCounselorId] = useState('')
  const [selectedTask, setSelectedTask] = useState<TaskWithClient | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    if (!res.ok) return
    const data = await res.json()
    setTasks(data.tasks ?? [])
    if (data.counselorId) setCounselorId(data.counselorId)
    setLoading(false)
  }, [])

  useEffect(() => {
    refreshTasks()
  }, [refreshTasks])

  useEffect(() => {
    if (!selectedTask) return
    const updated = tasks.find((t) => t.id === selectedTask.id)
    if (updated) setSelectedTask(updated)
  }, [tasks, selectedTask])

  return (
    <main className="flex-1 p-6 md:p-8">
      <h1 className="mb-6 text-2xl font-semibold text-blue md:text-3xl">Tasks</h1>
      {loading ? (
        <p className="text-text/60">Loading tasks…</p>
      ) : (
        <TaskPanel tasks={tasks} onTaskClick={setSelectedTask} />
      )}
      {selectedTask && counselorId && (
        <TaskDetailPanel
          task={{
            id: selectedTask.id,
            task_text: selectedTask.task_text,
            due_date: selectedTask.due_date ?? '',
            status: selectedTask.status,
            notes_count: selectedTask.notes_count ?? 0,
            negligence_flagged: selectedTask.negligence_flagged ?? false,
            clients: Array.isArray(selectedTask.clients)
              ? selectedTask.clients[0]
              : selectedTask.clients ?? undefined,
          }}
          counselorId={counselorId}
          onClose={() => setSelectedTask(null)}
          onUpdated={refreshTasks}
        />
      )}
    </main>
  )
}
