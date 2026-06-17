'use client'

import { useCallback, useEffect, useState } from 'react'
import { TaskDetailPanel } from '@/components/dashboard/TaskDetailPanel'
import {
  TaskPanel,
  type TaskWithClient,
} from '@/app/(counselor)/dashboard/tasks/TaskPanel'

type Props = {
  tasksApiUrl: string
  readOnly?: boolean
}

export function CounselorTasksView({ tasksApiUrl, readOnly = false }: Props) {
  const [tasks, setTasks] = useState<TaskWithClient[]>([])
  const [counselorId, setCounselorId] = useState('')
  const [selectedTask, setSelectedTask] = useState<TaskWithClient | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshTasks = useCallback(async () => {
    const res = await fetch(tasksApiUrl)
    if (!res.ok) return
    const data = await res.json()
    setTasks(data.tasks ?? [])
    if (data.counselorId) setCounselorId(data.counselorId)
    setLoading(false)
  }, [tasksApiUrl])

  useEffect(() => {
    setLoading(true)
    refreshTasks()
  }, [refreshTasks])

  useEffect(() => {
    if (!selectedTask) return
    const updated = tasks.find((t) => t.id === selectedTask.id)
    if (updated) setSelectedTask(updated)
  }, [tasks, selectedTask])

  return (
    <>
      {loading ? (
        <p className="text-white/50">Loading tasks…</p>
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
          readOnly={readOnly}
          onClose={() => setSelectedTask(null)}
          onUpdated={refreshTasks}
        />
      )}
    </>
  )
}
