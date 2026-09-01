'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getActivityDotColor } from '@/lib/activityColors'
import { formatPKTRegistrationDate } from '@/lib/pkt'
import { BriefCard } from './BriefCard'

export type ActivityLogEntry = {
  id: string
  action_type: string
  description: string
  created_at: string
  metadata?: Record<string, unknown> | null
}

type Props = {
  entries: ActivityLogEntry[]
}

export function ActivityHistorySection({ entries }: Props) {
  const [open, setOpen] = useState(true)

  return (
    <BriefCard>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2"
      >
        <div>
          <h2 className="text-left text-lg font-bold text-white">Activity History</h2>
          {!open && (
            <p className="text-left text-xs italic text-white/50">
              All entries are permanent and cannot be modified.
            </p>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-white/40 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
        )}
      </button>

      {open && (
        <div className="mt-4">
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
                    <p className="whitespace-pre-wrap text-sm text-white/80">{entry.description}</p>
                    {typeof entry.metadata?.note === 'string' &&
                      entry.metadata.note.trim() &&
                      !entry.description.includes(entry.metadata.note.trim()) && (
                        <p className="mt-1 whitespace-pre-wrap rounded-xl glass-card px-3 py-2 text-sm text-white/80">
                          {entry.metadata.note}
                        </p>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </BriefCard>
  )
}
