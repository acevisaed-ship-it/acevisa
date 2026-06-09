'use client'

import { type FormEvent, useState } from 'react'
import { X } from 'lucide-react'

type CounselorOption = { id: string; name: string }

type Props = {
  clientId: string
  clientName: string
  currentCounselorName: string | null
  currentCounselorId: string | null
  counselors: CounselorOption[]
  onClose: () => void
  onSuccess: (counselorName: string) => void
}

export function TransferModal({
  clientId,
  clientName,
  currentCounselorName,
  currentCounselorId,
  counselors,
  onClose,
  onSuccess,
}: Props) {
  const availableCounselors = counselors.filter((c) => c.id !== currentCounselorId)
  const [counselorId, setCounselorId] = useState(availableCounselors[0]?.id ?? '')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const inputClass =
    'min-h-[48px] w-full rounded-full border border-text bg-bg px-4 py-2.5 text-sm text-text outline-none focus:border-blue'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!counselorId) {
      setError('Please select a counselor')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/admin/clients/${clientId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counselorId,
          reason: reason.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Transfer failed')
        return
      }

      onSuccess(data.counselorName ?? 'counselor')
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
        className="flex h-full w-full flex-col overflow-y-auto bg-bg p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-[420px] sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="transfer-modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="transfer-modal-title" className="text-lg font-bold text-blue">
              Transfer {clientName}
            </h2>
            <p className="mt-2 text-sm text-text">
              Current counselor:{' '}
              <span className={currentCounselorName ? 'font-medium' : 'font-medium text-orange'}>
                {currentCounselorName ?? 'Unassigned'}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="transfer-counselor" className="mb-1.5 block text-sm text-text">
              Transfer to:
            </label>
            <select
              id="transfer-counselor"
              value={counselorId}
              onChange={(e) => setCounselorId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="" disabled>
                Select counselor...
              </option>
              {availableCounselors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="transfer-reason" className="mb-1.5 block text-sm text-text">
              Reason for transfer (optional)
            </label>
            <textarea
              id="transfer-reason"
              value={reason}
              rows={3}
              maxLength={300}
              placeholder="e.g. workload balancing, language match..."
              onChange={(e) => setReason(e.target.value)}
              className="w-full resize-none rounded-2xl border border-text bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text/40 outline-none focus:border-blue"
            />
          </div>

          {error && <p className="text-sm text-orange">{error}</p>}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !counselorId}
              className="min-h-[52px] w-full rounded-full bg-green py-3 text-sm font-bold text-text transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? 'Transferring...' : 'Transfer →'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full py-2 text-sm text-text transition-opacity hover:opacity-70"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
