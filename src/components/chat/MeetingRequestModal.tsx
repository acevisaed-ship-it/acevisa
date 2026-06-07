'use client'

import { type FormEvent, useMemo, useState } from 'react'

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-[360px] rounded-[20px] bg-bg p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="meeting-request-title"
      >
        <h2 id="meeting-request-title" className="text-lg font-bold text-blue">
          Request a meeting
        </h2>
        <p className="mt-1 text-sm text-text">
          A counselor will confirm your slot shortly.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
              className="w-full rounded-full border border-text bg-bg px-4 py-2.5 text-sm text-text outline-none focus:border-blue"
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
              className="w-full rounded-full border border-text bg-bg px-4 py-2.5 text-sm text-text outline-none focus:border-blue"
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

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-green py-3 text-sm font-bold text-text transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Send Request →'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-sm text-text transition-opacity hover:opacity-70"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
