import { formatPKTDate, formatPKTTime } from '@/lib/pkt'
import { BriefCard } from './BriefCard'

export type WalkInEntry = {
  id: string
  created_at: string
  metadata: { note?: string; loggedByName?: string } | null
}

type Props = {
  visits: WalkInEntry[]
}

/**
 * Office visits logged by reception (from the receptionist walk-in log),
 * surfaced prominently on the counselor's client profile — separate from
 * the general Activity History timeline further down the page, since a
 * reason-for-visit is easy to miss buried in a long generic feed.
 */
export function RecentVisitsSection({ visits }: Props) {
  if (visits.length === 0) return null

  return (
    <BriefCard>
      <h2 className="text-lg font-bold text-white">Office Visits</h2>
      <p className="mt-1 text-xs italic text-white/50">Logged by reception at the front desk.</p>

      <ul className="mt-4 space-y-3">
        {visits.map((v) => {
          const note = v.metadata?.note?.trim()
          const loggedBy = v.metadata?.loggedByName
          return (
            <li
              key={v.id}
              className="rounded-xl border border-white/10 px-4 py-3"
              style={{ backgroundColor: 'rgba(13, 148, 136, 0.08)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white/85">
                  {note || 'Walked into the office'}
                </span>
                <time className="text-xs text-white/50">
                  {formatPKTDate(v.created_at)} · {formatPKTTime(v.created_at)}
                </time>
              </div>
              {loggedBy && (
                <p className="mt-1 text-xs text-white/40">Logged by {loggedBy}</p>
              )}
            </li>
          )
        })}
      </ul>
    </BriefCard>
  )
}
