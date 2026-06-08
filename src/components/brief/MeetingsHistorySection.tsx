import Link from 'next/link'
import type { MeetingStatus } from '@/types'
import { formatPKTDate, formatPKTTime } from '@/lib/pkt'
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

type Props = {
  clientId: string
  meetings: MeetingWithCounselor[]
}

export function MeetingsHistorySection({ clientId, meetings }: Props) {
  return (
    <BriefCard>
      <h2 className="mb-4 text-lg font-bold text-text">Meetings History</h2>
      {meetings.length === 0 ? (
        <p className="text-sm text-text/60">No meetings scheduled yet.</p>
      ) : (
        <ul className="space-y-3">
          {meetings.map((meeting) => {
            const statusStyle = getStatusStyle(meeting.status)
            return (
              <li
                key={meeting.id}
                className="flex flex-col gap-2 rounded-xl bg-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-text">
                    {formatPKTDate(meeting.scheduled_time)}{' '}
                    {formatPKTTime(meeting.scheduled_time)} PKT
                  </p>
                  <p className="text-xs text-text/60">
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
                    className="text-sm font-medium text-blue hover:underline"
                  >
                    View Brief →
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <div className="mt-6 border-t border-text/10 pt-4">
        <Link
          href={`/schedule/${clientId}`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-blue px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Schedule a Meeting →
        </Link>
      </div>
    </BriefCard>
  )
}
