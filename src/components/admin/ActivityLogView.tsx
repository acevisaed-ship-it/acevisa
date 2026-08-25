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

// Every known actionType gets its own bright gradient, grouped by meaning:
//   green = success / completed / approved / created
//   red = urgent / negative / rejected / removed
//   blue = general task / informational
//   purple = stage / profile progression
//   orange = pending / requested / warning
//   indigo = attendance / time
//   pink = meetings
//   cyan = client / registration / applications
//   yellow = financial / reports / leave
const ACTION_COLORS: Record<string, string> = {
  // green — success / completed / approved / created
  task_completed: 'bg-grad-green text-white',
  task_closed: 'bg-grad-green text-white',
  complaint_acknowledged: 'bg-grad-green text-white',
  correction_applied: 'bg-grad-green text-white',
  correction_approved: 'bg-grad-green text-white',
  meeting_completed: 'bg-grad-green text-white',
  account_created: 'bg-grad-green text-white',
  profile_update_approved: 'bg-grad-green text-white',
  leave_approved: 'bg-grad-green text-white',
  manually_qualified: 'bg-grad-green text-white',
  reminder_resolved: 'bg-grad-green text-white',
  account_reactivated: 'bg-grad-green text-white',

  // red — urgent / negative / removed / rejected
  panic_detected: 'bg-grad-red text-white',
  complaint_received: 'bg-grad-red text-white',
  task_overdue: 'bg-grad-red text-white',
  task_negligence_flag: 'bg-grad-red text-white',
  client_removed: 'bg-grad-red text-white',
  account_deactivated: 'bg-grad-red text-white',
  account_deleted: 'bg-grad-red text-white',
  correction_rejected: 'bg-grad-red text-white',
  stage_suggestion_rejected: 'bg-grad-red text-white',
  profile_update_rejected: 'bg-grad-red text-white',
  leave_rejected: 'bg-grad-red text-white',
  account_suspended: 'bg-grad-red text-white',
  manually_unqualified: 'bg-grad-red text-white',
  attendance_absent: 'bg-grad-red text-white',

  // blue — general task / informational
  counselor_note: 'bg-grad-blue text-white',
  counselor_update: 'bg-grad-blue text-white',
  task_open: 'bg-grad-blue text-white',
  task_in_progress: 'bg-grad-blue text-white',
  task_status_update: 'bg-grad-blue text-white',
  task_note: 'bg-grad-blue text-white',
  task_assigned: 'bg-grad-blue text-white',
  document_uploaded: 'bg-grad-blue text-white',
  document_requested: 'bg-grad-blue text-white',
  password_reset: 'bg-grad-blue text-white',
  password_revealed: 'bg-grad-blue text-white',
  ai_message_sent: 'bg-grad-blue text-white',

  // purple — stage / profile progression
  stage_change: 'bg-grad-purple text-white',
  pipeline_stage_changed: 'bg-grad-purple text-white',
  profile_updated: 'bg-grad-purple text-white',
  profile_update_detected: 'bg-grad-purple text-white',
  counselor_transferred: 'bg-grad-purple text-white',
  counselor_assigned: 'bg-grad-purple text-white',
  client_assigned: 'bg-grad-purple text-white',

  // orange — pending / requested / warning
  correction_requested: 'bg-grad-orange text-white',
  meeting_requested: 'bg-grad-orange text-white',
  task_reminder_set: 'bg-grad-orange text-white',
  reminder_set: 'bg-grad-orange text-white',

  // indigo — attendance / time
  attendance_check_in: 'bg-grad-indigo text-white',
  attendance_check_out: 'bg-grad-indigo text-white',
  attendance_clock_in: 'bg-grad-indigo text-white',
  attendance_clock_out: 'bg-grad-indigo text-white',

  // pink — meetings
  meeting_scheduled: 'bg-grad-pink text-white',
  meeting_rescheduled: 'bg-grad-pink text-white',

  // cyan — client / registration / applications
  walk_in: 'bg-grad-cyan text-white',
  client_registered: 'bg-grad-cyan text-white',
  application_added: 'bg-grad-cyan text-white',
  application_status_changed: 'bg-grad-cyan text-white',

  // yellow — financial / reports / leave
  progress_report_sent: 'bg-grad-yellow text-white',
  leave_submitted: 'bg-grad-yellow text-white',
  brief_viewed: 'bg-grad-yellow text-white',
}

// Safety net for any actionType not covered above (e.g. a future addition) —
// mirrors the prefix logic in lib/activityColors.ts so nothing ever falls
// back to a flat gray badge.
function fallbackActionColor(type: string): string {
  if (type.startsWith('task_')) return 'bg-grad-blue text-white'
  if (type.startsWith('meeting_')) return 'bg-grad-pink text-white'
  if (type.startsWith('attendance_')) return 'bg-grad-indigo text-white'
  if (type.startsWith('correction_')) return 'bg-grad-orange text-white'
  if (type.startsWith('profile_')) return 'bg-grad-purple text-white'
  if (
    type.includes('rejected') ||
    type.includes('removed') ||
    type.includes('deactivated') ||
    type.includes('deleted') ||
    type.includes('overdue') ||
    type.includes('suspended') ||
    type.includes('absent') ||
    type.includes('panic') ||
    type.includes('negligence') ||
    type.includes('unqualified')
  ) {
    return 'bg-grad-red text-white'
  }
  if (
    type.includes('approved') ||
    type.includes('completed') ||
    type.includes('closed') ||
    type.includes('created') ||
    type.includes('qualified') ||
    type.includes('resolved') ||
    type.includes('reactivated')
  ) {
    return 'bg-grad-green text-white'
  }
  return 'bg-grad-cyan text-white'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ActionBadge({ type }: { type: string }) {
  const color = ACTION_COLORS[type] ?? fallbackActionColor(type)
  const label = type.replace(/_/g, ' ')
  return (
    <span
      className={`crisp-on-dark rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${color}`}
    >
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
    if (!res.ok) {
      console.error('[ActivityLogView] API error:', res.status, data)
      return
    }
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

  if (loading) return <p className="text-sm text-white/50">Loading activity log...</p>

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Activity Log</h1>
        <p className="mt-1 text-sm text-white/60">{total} events recorded</p>
      </div>

      {logs.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <Activity className="h-10 w-10 text-white/20" />
          <p className="text-white/50">No activity recorded yet</p>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-start gap-3 rounded-xl border border-white/10 glass-card crisp-on-dark px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionBadge type={log.actionType} />
                    {log.counselorName && (
                      <span className="text-xs font-medium text-white/80">{log.counselorName}</span>
                    )}
                    {log.clientName && log.clientId && (
                      <Link
                        href={`/admin/clients/${log.clientId}`}
                        className="text-xs text-white/60 hover:text-white hover:underline"
                      >
                        {log.clientName}
                      </Link>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-white/60">{log.description}</p>
                </div>
                <span className="shrink-0 text-xs text-white/40">{formatTime(log.createdAt)}</span>
              </div>
            ))}
          </div>

          {logs.length < total && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-full border border-white/20 glass-card px-5 py-2.5 text-sm font-medium text-white/60 hover:text-white disabled:opacity-50"
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
