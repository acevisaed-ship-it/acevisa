import { createAdminClient } from '@/lib/supabase/server'
import { getTodayPKTDateString, getPKTDayBounds, isDueTodayOrOverduePKT } from '@/lib/pkt'

export type TeamPanelMetrics = {
  counselorId: string
  openCount: number
  inProgressCount: number
  completedTodayCount: number
  closedTodayCount: number
  remainingTodayCount: number
  /** Genuine active-session time today, from the heartbeat ping (minutes). */
  portalActiveMinutes: number
  /** Clock-in → clock-out (or clock-in → now, if still clocked in) window today (minutes). */
  attendanceMinutes: number | null
}

/**
 * Per-counselor Team Panel metrics for "today" (PKT calendar day):
 * task counts across the 4-state workflow (open/in_progress/completed/closed),
 * plus both measures of time-on-portal — the always-both-manual-and-auto rule
 * applied to attendance (clock in/out, self-reported) vs. heartbeat (genuine
 * active-session tracking).
 *
 * `counselorIds` scopes the query to a specific set of counselors (e.g. one
 * branch); omit to cover everyone the caller is allowed to see.
 */
export async function getTeamPanelMetrics(counselorIds?: string[]): Promise<Map<string, TeamPanelMetrics>> {
  const supabase = createAdminClient()
  const today = getTodayPKTDateString()
  const { startUTC, endUTC } = getPKTDayBounds(today)

  let tasksQuery = supabase
    .from('tasks')
    .select('counselor_id, status, due_date, completed_at, closed_at')
  if (counselorIds?.length) {
    tasksQuery = tasksQuery.in('counselor_id', counselorIds)
  }

  let portalQuery = supabase
    .from('portal_sessions')
    .select('counselor_id, active_seconds')
    .eq('date', today)
  if (counselorIds?.length) {
    portalQuery = portalQuery.in('counselor_id', counselorIds)
  }

  let attendanceQuery = supabase
    .from('attendance_records')
    .select('counselor_id, check_in, check_out')
    .eq('date', today)
  if (counselorIds?.length) {
    attendanceQuery = attendanceQuery.in('counselor_id', counselorIds)
  }

  const [{ data: tasks }, { data: portalSessions }, { data: attendance }] = await Promise.all([
    tasksQuery,
    portalQuery,
    attendanceQuery,
  ])

  const metrics = new Map<string, TeamPanelMetrics>()

  function ensure(counselorId: string): TeamPanelMetrics {
    let m = metrics.get(counselorId)
    if (!m) {
      m = {
        counselorId,
        openCount: 0,
        inProgressCount: 0,
        completedTodayCount: 0,
        closedTodayCount: 0,
        remainingTodayCount: 0,
        portalActiveMinutes: 0,
        attendanceMinutes: null,
      }
      metrics.set(counselorId, m)
    }
    return m
  }

  for (const t of tasks ?? []) {
    if (!t.counselor_id) continue
    const m = ensure(t.counselor_id)

    if (t.status === 'open') {
      m.openCount++
      if (isDueTodayOrOverduePKT(t.due_date)) m.remainingTodayCount++
    } else if (t.status === 'in_progress') {
      m.inProgressCount++
      if (isDueTodayOrOverduePKT(t.due_date)) m.remainingTodayCount++
    } else if (t.status === 'completed') {
      if (t.completed_at && t.completed_at >= startUTC && t.completed_at <= endUTC) {
        m.completedTodayCount++
      }
    } else if (t.status === 'closed') {
      if (t.closed_at && t.closed_at >= startUTC && t.closed_at <= endUTC) {
        m.closedTodayCount++
      }
    }
  }

  for (const p of portalSessions ?? []) {
    if (!p.counselor_id) continue
    const m = ensure(p.counselor_id)
    m.portalActiveMinutes = Math.round((p.active_seconds ?? 0) / 60)
  }

  const now = Date.now()
  for (const a of attendance ?? []) {
    if (!a.counselor_id || !a.check_in) continue
    const m = ensure(a.counselor_id)
    const start = new Date(a.check_in).getTime()
    const end = a.check_out ? new Date(a.check_out).getTime() : now
    m.attendanceMinutes = Math.max(0, Math.round((end - start) / 60000))
  }

  return metrics
}
