'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, ChevronDown } from 'lucide-react'

type LogEntry = {
  id: string
  actionType: string
  description: string
  createdAt: string
  clientId: string | null
  clientName: string | null
  counselorId: string | null
  counselorName: string | null
  metadata: Record<string, unknown> | null
}

const ACTION_COLORS: Record<string, string> = {
  complaint_received: 'bg-orange/15 text-orange',
  complaint_acknowledged: 'bg-green/20 text-text',
  task_completed: 'bg-green/20 text-text',
  task_overdue: 'bg-orange/15 text-orange',
  document_uploaded: 'bg-blue/15 text-blue',
  meeting_scheduled: 'bg-blue/15 text-blue',
  meeting_completed: 'bg-green/20 text-text',
  profile_updated: 'bg-blue/15 text-blue',
  client_assigned: 'bg-blue/15 text-blue',
  pipeline_stage_changed: 'bg-blue/15 text-blue',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ActionBadge({ type }: { type: string }) {
  const color = ACTION_COLORS[type] ?? 'bg-text/10 text-text/60'
  const label = type.replace(/_/g, ' ')
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${color}`}>
      {label}
    </span>
  )
}

const PAGE_SIZE = 50

export function ActivityLogView() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)

  async function fetchLogs(off: number, append = false) {
    const res = await fetch(`/api/admin/activity?limit=${PAGE_SIZE}&offset=${off}`)
    const data = await res.json()
    if (append) {
      setLogs((prev) => [...prev, ...(data.logs ?? [])])
    } else {
      setLogs(data.logs ?? [])
    }
    setTotal(data.total ?? 0)
  }

  useEffect(() => {
    fetchLogs(0).finally(() => setLoading(false))
  }, [])

  async function loadMore() {
    const newOffset = offset + PAGE_SIZE
    setLoadingMore(true)
    await fetchLogs(newOffset, true)
    setOffset(newOffset)
    setLoadingMore(false)
  }

  if (loading) return <p className="text-sm text-text/50">Loading activity log...</p>

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-blue md:text-3xl">Activity Log</h1>
        <p className="mt-1 text-sm text-text/60">{total} events recorded</p>
      </div>

      {logs.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <Activity className="h-10 w-10 text-text/20" />
          <p className="text-text/50">No activity recorded yet</p>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-start gap-3 rounded-xl border border-text/8 bg-white px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionBadge type={log.actionType} />
                    {log.counselorName && (
                      <span className="text-xs font-medium text-text">{log.counselorName}</span>
                    )}
                    {log.clientName && log.clientId && (
                      <Link
                        href={`/admin/clients/${log.clientId}`}
                        className="text-xs text-blue hover:underline"
                      >
                        {log.clientName}
                      </Link>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-text/70">{log.description}</p>
                </div>
                <span className="shrink-0 text-xs text-text/40">{formatTime(log.createdAt)}</span>
              </div>
            ))}
          </div>

          {logs.length < total && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-full border border-text/20 px-5 py-2.5 text-sm font-medium text-text hover:bg-text/5 disabled:opacity-50"
              >
                <ChevronDown className="h-4 w-4" />
                {loadingMore ? 'Loading...' : `Load more (${total - logs.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
