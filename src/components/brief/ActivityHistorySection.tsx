import { getActivityDotColor } from '@/lib/activityColors'
import { formatPKTRegistrationDate } from '@/lib/pkt'
import { BriefCard } from './BriefCard'

export type ActivityLogEntry = {
  id: string
  action_type: string
  description: string
  created_at: string
}

type Props = {
  entries: ActivityLogEntry[]
}

export function ActivityHistorySection({ entries }: Props) {
  return (
    <BriefCard>
      <h2 className="text-lg font-bold text-white">Activity History</h2>
      <p className="mb-4 text-xs italic text-white/50">
        All entries are permanent and cannot be modified.
      </p>
      {entries.length === 0 ? (
        <p className="text-sm text-white/50">No activity recorded yet.</p>
      ) : (
        <ul className="space-y-0">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className={`relative ml-2 flex gap-4 pb-6 pl-6 ${
                index < entries.length - 1 ? 'border-l border-white/15' : ''
              }`}
            >
              <span
                className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getActivityDotColor(entry.action_type) }}
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <time className="text-xs text-white/50">
                    {formatPKTRegistrationDate(entry.created_at)}
                  </time>
                  <span
                    className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{
                      backgroundColor: getActivityDotColor(entry.action_type),
                    }}
                  >
                    {entry.action_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-white/80">{entry.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </BriefCard>
  )
}
