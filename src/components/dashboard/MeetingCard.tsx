import Link from 'next/link'
import { formatPKTDate, formatPKTTime } from '@/lib/pkt'

type Props = {
  id: string
  clientName: string
  scheduledTime: string
  showDate?: boolean
  briefHref?: string
}

export function MeetingCard({
  id,
  clientName,
  scheduledTime,
  showDate,
  briefHref,
}: Props) {
  const href = briefHref ?? `/dashboard/brief/${id}`
  return (
    <div className="flex overflow-hidden rounded-2xl border border-text/10 bg-bg">
      <div className="w-1 shrink-0 bg-green" />
      <div className="flex flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-text">{clientName}</p>
          <p className="text-sm text-blue">
            {showDate && <span>{formatPKTDate(scheduledTime)} · </span>}
            {formatPKTTime(scheduledTime)} PKT
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex w-full shrink-0 items-center justify-center rounded-full border border-text/20 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-text/40 sm:w-auto sm:min-h-[44px]"
        >
          View Brief →
        </Link>
      </div>
    </div>
  )
}
