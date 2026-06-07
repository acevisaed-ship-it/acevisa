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

  const [
    { data: todayMeetings },
    { data: upcomingMeetings },
    { data: tasks },
    { count: meetingsTodayCount },
    { count: qualifiedLeadsCount },
    { count: openTasksCount },
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
  ])

  const todayRows = (todayMeetings ?? []) as MeetingRow[]
  const upcomingRows = (upcomingMeetings ?? []) as MeetingRow[]
  const taskRows = (tasks ?? []) as TaskRowData[]

  return (
    <main className="flex-1 p-6 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-blue md:text-3xl">
          {getPKTGreeting()}, {counselor.name}
        </h1>
        <p className="mt-1 text-sm text-text">{formatPKTDateLong()}</p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Meetings today" value={meetingsTodayCount ?? 0} />
        <StatCard label="Qualified leads" value={qualifiedLeadsCount ?? 0} />
        <StatCard label="Open tasks" value={openTasksCount ?? 0} />
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

      <section>
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
    </main>
  )
}
