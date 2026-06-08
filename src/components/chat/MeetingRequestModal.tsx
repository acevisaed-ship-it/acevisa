'use client'

import { type FormEvent, useMemo, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  clientId: string
  onClose: () => void
  onSuccess: () => void
}

export function MeetingRequestModal({ clientId, onClose, onSuccess }: Props) {
  const { minDate, maxDate } = useMemo(() => {
    const today = new Date()
    const max = new Date(today)
    max.setDate(max.getDate() + 7)
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    return { minDate: fmt(today), maxDate: fmt(max) }
  }, [])

  const [preferredDate, setPreferredDate] = useState(minDate)
  const [preferredTimeOfDay, setPreferredTimeOfDay] = useState('morning')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/meetings/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          preferredDate,
          preferredTimeOfDay,
          note: note.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to submit request')
        return
      }

      onSuccess()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    'min-h-[48px] w-full rounded-full border border-text bg-bg px-4 py-2.5 text-sm text-text outline-none focus:border-blue'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-full w-full flex-col overflow-y-auto bg-bg p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-[360px] sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="meeting-request-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4 sm:mb-0">
          <div>
            <h2 id="meeting-request-title" className="text-lg font-bold text-blue">
              Request a meeting
            </h2>
            <p className="mt-1 text-sm text-text">
              A counselor will confirm your slot shortly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-text sm:hidden"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-1 flex-col space-y-4">
          <div>
            <label htmlFor="preferred-date" className="mb-1.5 block text-sm text-text">
              Preferred date
            </label>
            <input
              id="preferred-date"
              type="date"
              value={preferredDate}
              min={minDate}
              max={maxDate}
              required
              onChange={(e) => setPreferredDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="preferred-time" className="mb-1.5 block text-sm text-text">
              Preferred time of day
            </label>
            <select
              id="preferred-time"
              value={preferredTimeOfDay}
              required
              onChange={(e) => setPreferredTimeOfDay(e.target.value)}
              className={inputClass}
            >
              <option value="morning">Morning (9am – 12pm)</option>
              <option value="afternoon">Afternoon (12pm – 3pm)</option>
              <option value="evening">Evening (3pm – 6pm)</option>
            </select>
          </div>

          <div>
            <label htmlFor="meeting-note" className="mb-1.5 block text-sm text-text">
              Note (optional)
            </label>
            <textarea
              id="meeting-note"
              value={note}
              maxLength={200}
              rows={3}
              placeholder="Anything you'd like us to know before the meeting?"
              onChange={(e) => setNote(e.target.value)}
              className="w-full resize-none rounded-2xl border border-text bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text/40 outline-none focus:border-blue"
            />
          </div>

          {error && <p className="text-sm text-orange">{error}</p>}

          <div className="mt-auto flex flex-col gap-2 pt-4 sm:pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[52px] w-full rounded-full bg-green py-3 text-sm font-bold text-text transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Send Request →'}
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
