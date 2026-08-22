'use client'

import { type FormEvent, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  clientId: string
  clientName: string
  onClose: () => void
  onSuccess: () => void
}

export function RemoveClientModal({ clientId, clientName, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/admin/clients/${clientId}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to remove client')
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
        aria-labelledby="remove-modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="remove-modal-title" className="text-lg font-bold text-white">
              Remove {clientName}
            </h2>
            <p className="mt-2 text-sm text-white/70">
              This removes the client from Pipeline, All Clients, and the counselor&apos;s
              panel. Their record, history, and financial data are kept for audit purposes —
              this is not permanent deletion.
            </p>
          </div>
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
            <label htmlFor="remove-reason" className="mb-1.5 block text-sm text-white/70">
              Reason (optional)
            </label>
            <textarea
              id="remove-reason"
              value={reason}
              rows={3}
              maxLength={300}
              placeholder="e.g. duplicate record, client requested removal..."
              onChange={(e) => setReason(e.target.value)}
              className="w-full resize-none rounded-2xl px-4 py-2.5 text-sm outline-none glass-input"
            />
          </div>

          {error && <p className="text-sm text-orange">{error}</p>}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[52px] w-full rounded-full bg-red-500/80 py-3 text-sm font-bold text-white transition-opacity hover:bg-red-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Removing...' : 'Remove Client'}
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
