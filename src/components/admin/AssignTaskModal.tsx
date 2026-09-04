'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  targetId: string
  targetName: string
  onClose: () => void
  onSuccess: () => void
}

type ClientHit = {
  id: string
  name: string
  client_code: string | null
  phone: string | null
}

export function AssignTaskModal({ targetId, targetName, onClose, onSuccess }: Props) {
  const [taskText, setTaskText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isMilestone, setIsMilestone] = useState(false)
  const [clientQuery, setClientQuery] = useState('')
  const [clientHits, setClientHits] = useState<ClientHit[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientHit | null>(null)
  const [autoLinked, setAutoLinked] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const selectedRef = useRef(selectedClient)
  const autoLinkedRef = useRef(autoLinked)
  const dismissedForText = useRef('')
  selectedRef.current = selectedClient
  autoLinkedRef.current = autoLinked

  useEffect(() => {
    if (selectedClient) return
    const q = clientQuery.trim()
    if (q.length < 2) {
      setClientHits([])
      return
    }
    const handle = setTimeout(() => {
      fetch(`/api/admin/clients?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setClientHits(d.clients ?? []))
        .catch(() => setClientHits([]))
    }, 250)
    return () => clearTimeout(handle)
  }, [clientQuery, selectedClient])

  useEffect(() => {
    const text = taskText.trim()
    if (text.length < 4) {
      if (autoLinkedRef.current) {
        setSelectedClient(null)
        setAutoLinked(false)
      }
      return
    }
    if (selectedRef.current && !autoLinkedRef.current) return
    if (dismissedForText.current === text) return

    const handle = setTimeout(() => {
      fetch(`/api/admin/counselors/${targetId}/tasks?resolveText=${encodeURIComponent(text)}`)
        .then((r) => r.json())
        .then((d: { client?: ClientHit | null }) => {
          if (selectedRef.current && !autoLinkedRef.current) return
          if (d.client) {
            setSelectedClient(d.client)
            setAutoLinked(true)
            setClientHits([])
          } else if (autoLinkedRef.current) {
            setSelectedClient(null)
            setAutoLinked(false)
          }
        })
        .catch(() => {
          /* keep whatever is currently selected */
        })
    }, 400)
    return () => clearTimeout(handle)
  }, [taskText, targetId])

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
          is_milestone: isMilestone,
          client_id: selectedClient?.id,
          auto_link: selectedClient
            ? true
            : dismissedForText.current !== taskText.trim(),
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
            <label htmlFor="task-client" className="mb-1.5 block text-sm text-white/70">
              Link to student (recommended)
            </label>
            {selectedClient ? (
              <div className="flex items-center justify-between gap-2 rounded-2xl glass-card px-4 py-2.5">
                <p className="min-w-0 truncate text-sm text-white">
                  {selectedClient.name}
                  {selectedClient.client_code ? ` · ${selectedClient.client_code}` : ''}
                  {autoLinked ? ' · auto-linked' : ''}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    dismissedForText.current = taskText.trim()
                    setSelectedClient(null)
                    setAutoLinked(false)
                    setClientQuery('')
                    setClientHits([])
                  }}
                  className="shrink-0 text-xs font-semibold text-white/50 hover:text-white"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  id="task-client"
                  type="search"
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  placeholder="Search by name, phone, or client ID"
                  className="min-h-[48px] w-full rounded-full px-4 py-2.5 text-sm outline-none glass-input"
                />
                {clientHits.length > 0 && (
                  <ul className="mt-2 overflow-hidden rounded-2xl border border-white/10">
                    {clientHits.map((hit) => (
                      <li key={hit.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClient(hit)
                            setAutoLinked(false)
                            setClientHits([])
                          }}
                          className="flex min-h-[44px] w-full flex-col items-start px-4 py-2 text-left hover:bg-white/10"
                        >
                          <span className="text-sm text-white">{hit.name}</span>
                          <span className="text-xs text-white/50">
                            {[hit.client_code, hit.phone].filter(Boolean).join(' · ')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            <p className="mt-1.5 text-xs text-white/40">
              If the task names a student, they are linked automatically. Completions and notes then show on their profile.
            </p>
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

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={isMilestone}
              onChange={(e) => setIsMilestone(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Milestone-based — closes when this student's case moves to the next stage
          </label>

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
