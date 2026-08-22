import { createAdminClient } from '@/lib/supabase/server'
import {
  addDaysToDateString,
  getPKTDayBounds,
  getTodayPKTDateString,
  isDueTodayOrOverduePKT,
} from '@/lib/pkt'

type MeetingRow = {
  id: string
  scheduled_time: string
  clients: { name: string } | { name: string }[] | null
}

type TaskRowData = {
  id: string
  task_text: string
  due_date: string | null
}

type CompletedTaskRowData = {
  id: string
  task_text: string
  completed_at: string | null
}

type ComplaintRowData = {
  id: string
  client_name: string | null
  subject: string
  created_at: string
}

export type CounselorDashboardData = {
  counselorName: string
  todayMeetings: MeetingRow[]
  upcomingMeetings: MeetingRow[]
  tasks: TaskRowData[]
  tasksDueToday: TaskRowData[]
  tasksCompletedToday: CompletedTaskRowData[]
  meetingsTodayCount: number
  qualifiedLeadsCount: number
  openTasksCount: number
  tasksDueTodayCount: number
  avgResponse: number | null
  complaints: ComplaintRowData[]
}

export async function getCounselorDashboardData(
  counselorId: string
): Promise<CounselorDashboardData | null> {
  const supabase = createAdminClient()

  const { data: counselor } = await supabase
    .from('counselors')
    .select('id, name')
    .eq('id', counselorId)
    .single()

  if (!counselor) return null

  const todayPKT = getTodayPKTDateString()
  const { startUTC: todayStart, endUTC: todayEnd } = getPKTDayBounds(todayPKT)
  const tomorrowPKT = addDaysToDateString(todayPKT, 1)
  const weekEndPKT = addDaysToDateString(todayPKT, 7)
  const { startUTC: upcomingStart } = getPKTDayBounds(tomorrowPKT)
  const { endUTC: upcomingEnd } = getPKTDayBounds(weekEndPKT)

  const { data: counselorClients } = await supabase
    .from('clients')
    .select('id')
    .eq('counselor_id', counselorId)
    .neq('status', 'removed')

  const clientIds = (counselorClients ?? []).map((c) => c.id)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: todayMeetings },
    { data: upcomingMeetings },
    { data: tasks },
    { count: meetingsTodayCount },
    { count: qualifiedLeadsCount },
    { count: openTasksCount },
    { data: responseStats },
    { data: complaints },
    { data: completedTasks },
  ] = await Promise.all([
    supabase
      .from('meetings')
      .select('id, scheduled_time, clients(name)')
      .eq('counselor_id', counselorId)
      .eq('status', 'scheduled')
      .gte('scheduled_time', todayStart)
      .lte('scheduled_time', todayEnd)
      .order('scheduled_time', { ascending: true }),
    supabase
      .from('meetings')
      .select('id, scheduled_time, clients(name)')
      .eq('counselor_id', counselorId)
      .eq('status', 'scheduled')
      .gte('scheduled_time', upcomingStart)
      .lte('scheduled_time', upcomingEnd)
      .order('scheduled_time', { ascending: true })
      .limit(5),
    supabase
      .from('tasks')
      .select('id, task_text, due_date')
      .eq('counselor_id', counselorId)
      .eq('status', 'pending')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('counselor_id', counselorId)
      .eq('status', 'scheduled')
      .gte('scheduled_time', todayStart)
      .lte('scheduled_time', todayEnd),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('counselor_id', counselorId)
      .eq('pipeline_stage', 2)
      .neq('status', 'removed'),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('counselor_id', counselorId)
      .eq('status', 'pending'),
    clientIds.length > 0
      ? supabase
          .from('response_tracking')
          .select('response_time_seconds')
          .not('response_time_seconds', 'is', null)
          .eq('response_by', 'ai')
          .gte('created_at', sevenDaysAgo)
          .in('client_id', clientIds)
      : Promise.resolve({ data: [] as { response_time_seconds: number | null }[] }),
    clientIds.length > 0
      ? supabase
          .from('complaints')
          .select('*')
          .eq('status', 'open')
          .in('client_id', clientIds)
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as ComplaintRowData[] }),
    supabase
      .from('tasks')
      .select('id, task_text, completed_at')
      .eq('counselor_id', counselorId)
      .eq('status', 'completed')
      .gte('completed_at', todayStart)
      .lte('completed_at', todayEnd)
      .order('completed_at', { ascending: false }),
  ])

  const avgResponse = responseStats?.length
    ? Math.round(
        responseStats.reduce((s, r) => s + (r.response_time_seconds || 0), 0) /
          responseStats.length
      )
    : null

  const allTasks = (tasks ?? []) as TaskRowData[]
  // "Pending tasks for today" — due today or already overdue, i.e. anything
  // that needs action right now. Excludes tasks with a future due date and
  // open-ended tasks with no due date at all.
  const tasksDueToday = allTasks.filter((t) => isDueTodayOrOverduePKT(t.due_date))

  return {
    counselorName: counselor.name,
    todayMeetings: (todayMeetings ?? []) as MeetingRow[],
    upcomingMeetings: (upcomingMeetings ?? []) as MeetingRow[],
    tasks: allTasks,
    tasksDueToday,
    tasksCompletedToday: (completedTasks ?? []) as CompletedTaskRowData[],
    meetingsTodayCount: meetingsTodayCount ?? 0,
    qualifiedLeadsCount: qualifiedLeadsCount ?? 0,
    openTasksCount: openTasksCount ?? 0,
    tasksDueTodayCount: tasksDueToday.length,
    avgResponse,
    complaints: (complaints ?? []) as ComplaintRowData[],
  }
}
