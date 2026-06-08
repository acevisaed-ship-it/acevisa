import Link from 'next/link'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import {
  addDaysToDateString,
  formatPKTDateLong,
  getPKTGreeting,
  getPKTDayBounds,
  getTodayPKTDateString,
} from '@/lib/pkt'
import { MeetingCard } from '@/components/dashboard/MeetingCard'
import { StatCard } from '@/components/dashboard/StatCard'
import { TaskRow } from '@/components/dashboard/TaskRow'
import { ComplaintRow } from '@/components/dashboard/ComplaintRow'

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

type ComplaintRowData = {
  id: string
  client_name: string | null
  subject: string
  created_at: string
}

function getClientName(clients: MeetingRow['clients']): string {
  if (!clients) return 'Unknown client'
  if (Array.isArray(clients)) return clients[0]?.name ?? 'Unknown client'
  return clients.name
}

export default async function CounselorDashboardPage() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return null

  const supabase = createAdminClient()
  const todayPKT = getTodayPKTDateString()
  const { startUTC: todayStart, endUTC: todayEnd } = getPKTDayBounds(todayPKT)
  const tomorrowPKT = addDaysToDateString(todayPKT, 1)
  const weekEndPKT = addDaysToDateString(todayPKT, 7)
  const { startUTC: upcomingStart } = getPKTDayBounds(tomorrowPKT)
  const { endUTC: upcomingEnd } = getPKTDayBounds(weekEndPKT)

  const { data: counselorClients } = await supabase
    .from('clients')
    .select('id')
    .eq('counselor_id', counselor.id)

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
  ] = await Promise.all([
    supabase
      .from('meetings')
      .select('id, scheduled_time, clients(name)')
      .eq('counselor_id', counselor.id)
      .eq('status', 'scheduled')
      .gte('scheduled_time', todayStart)
      .lte('scheduled_time', todayEnd)
      .order('scheduled_time', { ascending: true }),
    supabase
      .from('meetings')
      .select('id, scheduled_time, clients(name)')
      .eq('counselor_id', counselor.id)
      .eq('status', 'scheduled')
      .gte('scheduled_time', upcomingStart)
      .lte('scheduled_time', upcomingEnd)
      .order('scheduled_time', { ascending: true })
      .limit(5),
    supabase
      .from('tasks')
      .select('id, task_text, due_date')
      .eq('counselor_id', counselor.id)
      .eq('status', 'pending')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('counselor_id', counselor.id)
      .eq('status', 'scheduled')
      .gte('scheduled_time', todayStart)
      .lte('scheduled_time', todayEnd),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('counselor_id', counselor.id)
      .eq('pipeline_stage', 2),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('counselor_id', counselor.id)
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
  ])

  const avgResponse = responseStats?.length
    ? Math.round(
        responseStats.reduce((s, r) => s + (r.response_time_seconds || 0), 0) /
          responseStats.length
      )
    : null

  const avgResponseColor: 'green' | 'orange' | 'red' | 'default' =
    avgResponse === null
      ? 'default'
      : avgResponse < 10
        ? 'green'
        : avgResponse <= 30
          ? 'orange'
          : 'red'

  const todayRows = (todayMeetings ?? []) as MeetingRow[]
  const upcomingRows = (upcomingMeetings ?? []) as MeetingRow[]
  const taskRows = (tasks ?? []) as TaskRowData[]
  const complaintRows = (complaints ?? []) as ComplaintRowData[]

  return (
    <main className="flex-1 p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-blue md:text-3xl">
          {getPKTGreeting()}, {counselor.name}
        </h1>
        <p className="mt-1 text-sm text-text">{formatPKTDateLong()}</p>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Meetings today" value={meetingsTodayCount ?? 0} />
        <StatCard label="Qualified leads" value={qualifiedLeadsCount ?? 0} />
        <StatCard label="Open tasks" value={openTasksCount ?? 0} />
        <StatCard
          label="Avg AI Response"
          value={avgResponse !== null ? `${avgResponse} sec` : '—'}
          valueColor={avgResponseColor}
        />
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-text">Today&apos;s meetings</h2>
        {todayRows.length === 0 ? (
          <p className="text-text/60">No meetings today. Enjoy the quiet.</p>
        ) : (
          <div className="space-y-3">
            {todayRows.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                id={meeting.id}
                clientName={getClientName(meeting.clients)}
                scheduledTime={meeting.scheduled_time}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-text">Upcoming meetings</h2>
        {upcomingRows.length === 0 ? (
          <p className="text-text/60">No upcoming meetings in the next 7 days.</p>
        ) : (
          <div className="space-y-3">
            {upcomingRows.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                id={meeting.id}
                clientName={getClientName(meeting.clients)}
                scheduledTime={meeting.scheduled_time}
                showDate
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-text">Open tasks</h2>
          <Link href="/dashboard/tasks" className="text-sm text-blue hover:underline">
            View all
          </Link>
        </div>
        {taskRows.length === 0 ? (
          <p className="text-text/60">All clear — no pending tasks.</p>
        ) : (
          <div className="space-y-3">
            {taskRows.slice(0, 5).map((task) => (
              <TaskRow key={task.id} taskText={task.task_text} dueDate={task.due_date} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-text">Complaints</h2>
        {complaintRows.length === 0 ? (
          <p className="text-text/60">No open complaints.</p>
        ) : (
          <div className="space-y-3">
            {complaintRows.map((complaint) => (
              <ComplaintRow
                key={complaint.id}
                id={complaint.id}
                clientName={complaint.client_name || 'Unknown'}
                subject={complaint.subject}
                createdAt={complaint.created_at}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
