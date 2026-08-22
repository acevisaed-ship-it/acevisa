import { createAdminClient } from '@/lib/supabase/server'
import { addDaysToDateString, getPKTDayBounds, getTodayPKTDateString } from '@/lib/pkt'

export type ReportPeriod = 'day' | 'week' | 'month' | 'all'

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  day: "Today's",
  week: 'This week',
  month: 'This month',
  all: 'All-time',
}

export type CounselorProgressReport = {
  counselorId: string
  counselorName: string
  period: ReportPeriod
  periodLabel: string
  rangeLabel: string
  newClients: number
  qualifiedLeads: number
  tasksCompleted: number
  tasksOpen: number
  meetingsHeld: number
  meetingsScheduled: number
  avgResponseTimeSeconds: number | null
  lateDays: number
  absentDays: number
}

function periodStartPKT(period: ReportPeriod, todayPKT: string): string | null {
  switch (period) {
    case 'day':
      return todayPKT
    case 'week':
      return addDaysToDateString(todayPKT, -6)
    case 'month':
      return addDaysToDateString(todayPKT, -29)
    case 'all':
      return null
  }
}

export async function getCounselorProgressReport(
  counselorId: string,
  period: ReportPeriod
): Promise<CounselorProgressReport | null> {
  const supabase = createAdminClient()

  const { data: counselor } = await supabase
    .from('counselors')
    .select('id, name')
    .eq('id', counselorId)
    .single()

  if (!counselor) return null

  const todayPKT = getTodayPKTDateString()
  const startDayPKT = periodStartPKT(period, todayPKT)
  const startUTC = startDayPKT ? getPKTDayBounds(startDayPKT).startUTC : null
  const { endUTC } = getPKTDayBounds(todayPKT)

  const rangeLabel =
    period === 'all'
      ? 'All time'
      : period === 'day'
        ? todayPKT
        : `${startDayPKT} to ${todayPKT}`

  let newClientsQuery = supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('counselor_id', counselorId)
    .neq('status', 'removed')
    .lte('registration_date', endUTC)
  if (startUTC) newClientsQuery = newClientsQuery.gte('registration_date', startUTC)

  let qualifiedQuery = supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('counselor_id', counselorId)
    .neq('status', 'removed')
    .lte('registration_date', endUTC)
    .or('manually_qualified.eq.true,pipeline_stage.gte.2')
  if (startUTC) qualifiedQuery = qualifiedQuery.gte('registration_date', startUTC)

  let tasksCompletedQuery = supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('counselor_id', counselorId)
    .eq('status', 'completed')
    .lte('completed_at', endUTC)
  if (startUTC) tasksCompletedQuery = tasksCompletedQuery.gte('completed_at', startUTC)

  let meetingsQuery = supabase
    .from('meetings')
    .select('id, status')
    .eq('counselor_id', counselorId)
    .lte('scheduled_time', endUTC)
  if (startUTC) meetingsQuery = meetingsQuery.gte('scheduled_time', startUTC)

  let responseQuery = supabase
    .from('response_tracking')
    .select('response_time_seconds')
    .eq('response_by', 'counselor')
    .not('response_time_seconds', 'is', null)
    .lte('response_at', endUTC)
  if (startUTC) responseQuery = responseQuery.gte('response_at', startUTC)

  let attendanceQuery = supabase
    .from('attendance_records')
    .select('status')
    .eq('counselor_id', counselorId)
    .in('status', ['late', 'absent'])
    .lte('date', todayPKT)
  if (startDayPKT) attendanceQuery = attendanceQuery.gte('date', startDayPKT)

  const [
    { count: newClients },
    { count: qualifiedLeads },
    { count: tasksCompleted },
    { count: tasksOpen },
    { data: meetingsInRange },
    { data: responseRows },
    { data: attendanceIssues },
  ] = await Promise.all([
    newClientsQuery,
    qualifiedQuery,
    tasksCompletedQuery,
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('counselor_id', counselorId)
      .eq('status', 'pending'),
    meetingsQuery,
    responseQuery,
    attendanceQuery,
  ])

  const meetingsHeld = (meetingsInRange ?? []).filter((m) => m.status === 'completed').length
  const meetingsScheduled = (meetingsInRange ?? []).length

  const avgResponseTimeSeconds = responseRows?.length
    ? Math.round(
        responseRows.reduce((s, r) => s + (r.response_time_seconds ?? 0), 0) / responseRows.length
      )
    : null

  const lateDays = (attendanceIssues ?? []).filter((a) => a.status === 'late').length
  const absentDays = (attendanceIssues ?? []).filter((a) => a.status === 'absent').length

  return {
    counselorId,
    counselorName: counselor.name,
    period,
    periodLabel: REPORT_PERIOD_LABELS[period],
    rangeLabel,
    newClients: newClients ?? 0,
    qualifiedLeads: qualifiedLeads ?? 0,
    tasksCompleted: tasksCompleted ?? 0,
    tasksOpen: tasksOpen ?? 0,
    meetingsHeld,
    meetingsScheduled,
    avgResponseTimeSeconds,
    lateDays,
    absentDays,
  }
}

/** Branch admin(s) + CEO(s) who should receive this counselor's report. */
export async function getReportRecipientEmails(counselorId: string): Promise<string[]> {
  const supabase = createAdminClient()
  const { data: primary } = await supabase
    .from('counselors')
    .select('branch_id')
    .eq('id', counselorId)
    .maybeSingle()

  const orFilters = ['role.eq.ceo']
  if (primary?.branch_id) {
    orFilters.push(`and(role.eq.admin,branch_id.eq.${primary.branch_id})`)
  }

  const { data: leadership } = await supabase
    .from('counselors')
    .select('email')
    .or(orFilters.join(','))
    .eq('status', 'active')

  return (leadership ?? []).map((l) => l.email).filter((e): e is string => !!e)
}
