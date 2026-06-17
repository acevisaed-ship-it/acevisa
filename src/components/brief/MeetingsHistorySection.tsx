'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { MeetingStatus } from '@/types'
import { formatPKTDate, formatPKTTime } from '@/lib/pkt'
import { toPKT, toUTC } from '@/lib/utils'
import { BriefCard } from './BriefCard'

export type MeetingWithCounselor = {
  id: string
  scheduled_time: string
  status: MeetingStatus
  counselors: { name: string } | { name: string }[] | null
}

function getCounselorName(meeting: MeetingWithCounselor): string {
  const c = meeting.counselors
  if (!c) return '—'
  if (Array.isArray(c)) return c[0]?.name ?? '—'
  return c.name
}

function getStatusStyle(status: MeetingStatus): { bg: string; label: string } {
  switch (status) {
    case 'scheduled':
      return { bg: '#2083B9', label: 'Scheduled' }
    case 'completed':
      return { bg: '#B7C733', label: 'Completed' }
    case 'cancelled':
      return { bg: '#9CA3AF', label: 'Cancelled' }
    default:
      return { bg: '#9CA3AF', label: status }
  }
}

function utcToPktDatetimeLocal(isoString: string): string {
  const pkt = toPKT(isoString)
  const y = pkt.getUTCFullYear()
  const m = String(pkt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(pkt.getUTCDate()).padStart(2, '0')
  const h = String(pkt.getUTCHours()).padStart(2, '0')
  const min = String(pkt.getUTCMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

function pktDatetimeLocalToUtcIso(localValue: string): string {
  const [datePart, timePart] = localValue.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [h, min] = timePart.split(':').map(Number)
  const pktAsUtc = new Date(Date.UTC(y, m - 1, d, h, min))
  return toUTC(pktAsUtc).toISOString()
}

function RescheduleMeetingButton({
  meetingId,
  scheduledTime,
}: {
  meetingId: string
  scheduledTime: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [datetime, setDatetime] = useState(() => utcToPktDatetimeLocal(scheduledTime))
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/meetings/${meetingId}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newScheduledTime: pktDatetimeLocalToUtcIso(datetime) }),
      })

      if (!res.ok) {
        setMessage('Could not reschedule')
        return
      }

      setMessage('Rescheduled')
      setOpen(false)
      router.refresh()
    } catch {
      setMessage('Could not reschedule')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setMessage(null)
            setDatetime(utcToPktDatetimeLocal(scheduledTime))
          }}
          className="text-sm font-medium text-white/70 hover:text-white hover:underline"
        >
          Reschedule
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            required
            className="rounded-lg rounded-lg px-2 py-1 text-sm glass-input"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="text-sm font-medium text-white/70 hover:text-white hover:underline disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-white/50 hover:text-white hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {message && <span className="text-xs text-white/60">{message}</span>}
    </div>
  )
}

type Props = {
  clientId: string
  meetings: MeetingWithCounselor[]
}

export function MeetingsHistorySection({ clientId, meetings }: Props) {
  return (
    <BriefCard>
      <h2 className="mb-4 text-lg font-bold text-white">Meetings History</h2>
      {meetings.length === 0 ? (
        <p className="text-sm text-white/50">No meetings scheduled yet.</p>
      ) : (
        <ul className="space-y-3">
          {meetings.map((meeting) => {
            const statusStyle = getStatusStyle(meeting.status)
            return (
              <li
                key={meeting.id}
                className="flex flex-col gap-2 rounded-xl glass-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-white/80">
                    {formatPKTDate(meeting.scheduled_time)}{' '}
                    {formatPKTTime(meeting.scheduled_time)} PKT
                  </p>
                  <p className="text-xs text-white/50">
                    Counselor: {getCounselorName(meeting)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  <span
                    className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: statusStyle.bg }}
                  >
                    {statusStyle.label}
                  </span>
                  <Link
                    href={`/dashboard/brief/${meeting.id}`}
                    className="text-sm font-medium text-white/70 hover:text-white hover:underline"
                  >
                    View Brief →
                  </Link>
                  {meeting.status === 'scheduled' && (
                    <RescheduleMeetingButton
                      meetingId={meeting.id}
                      scheduledTime={meeting.scheduled_time}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <div className="mt-6 border-t border-white/10 pt-4">
        <Link
          href={`/schedule/${clientId}`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-grad-blue crisp-on-dark px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Schedule a Meeting →
        </Link>
      </div>
    </BriefCard>
  )
}
