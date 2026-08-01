'use client'

import { type FormEvent, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  targetId: string
  targetName: string
  onClose: () => void
  onSuccess: () => void
}

export function AssignTaskModal({ targetId, targetName, onClose, onSuccess }: Props) {
  const [taskText, setTaskText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!taskText.trim()) {
      setError('Please describe the task')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/counselors/${targetId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_text: taskText.trim(),
          due_date: dueDate || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to assign task')
        return
      }
      onSuccess()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-full w-full flex-col overflow-y-auto dark-modal p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-[420px] sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="assign-task-modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="assign-task-modal-title" className="text-lg font-bold text-white">
            Assign task to {targetName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-white/60 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="task-text" className="mb-1.5 block text-sm text-white/70">
              Task
            </label>
            <textarea
              id="task-text"
              value={taskText}
              rows={3}
              maxLength={500}
              placeholder="e.g. Follow up on outstanding documents for..."
              onChange={(e) => setTaskText(e.target.value)}
              className="w-full resize-none rounded-2xl px-4 py-2.5 text-sm outline-none glass-input"
              required
            />
          </div>

          <div>
            <label htmlFor="task-due" className="mb-1.5 block text-sm text-white/70">
              Due date (optional)
            </label>
            <input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="min-h-[48px] w-full rounded-full px-4 py-2.5 text-sm outline-none glass-input"
            />
          </div>

          {error && <p className="text-sm text-orange">{error}</p>}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !taskText.trim()}
              className="min-h-[52px] w-full rounded-full bg-green py-3 text-sm font-bold text-text transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? 'Assigning...' : 'Assign task →'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full py-2 text-sm text-white/50 transition-opacity hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
