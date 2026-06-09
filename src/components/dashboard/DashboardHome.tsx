import Link from 'next/link'
import { formatPKTDateLong, getPKTGreeting } from '@/lib/pkt'
import type { CounselorDashboardData } from '@/lib/dashboard/getCounselorDashboardData'
import { MeetingCard } from '@/components/dashboard/MeetingCard'
import { StatCard } from '@/components/dashboard/StatCard'
import { TaskRow } from '@/components/dashboard/TaskRow'
import { ComplaintRow } from '@/components/dashboard/ComplaintRow'

type MeetingRow = CounselorDashboardData['todayMeetings'][number]

function getClientName(clients: MeetingRow['clients']): string {
  if (!clients) return 'Unknown client'
  if (Array.isArray(clients)) return clients[0]?.name ?? 'Unknown client'
  return clients.name
}

type Props = {
  data: CounselorDashboardData
  tasksHref?: string
  briefBasePath?: string
}

export function DashboardHome({
  data,
  tasksHref = '/dashboard/tasks',
  briefBasePath = '/dashboard/brief',
}: Props) {
  const avgResponseColor: 'green' | 'orange' | 'red' | 'default' =
    data.avgResponse === null
      ? 'default'
      : data.avgResponse < 10
        ? 'green'
        : data.avgResponse <= 30
          ? 'orange'
          : 'red'

  return (
    <main className="flex-1 p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-blue md:text-3xl">
          {getPKTGreeting()}, {data.counselorName}
        </h1>
        <p className="mt-1 text-sm text-text">{formatPKTDateLong()}</p>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Meetings today" value={data.meetingsTodayCount} />
        <StatCard label="Qualified leads" value={data.qualifiedLeadsCount} />
        <StatCard label="Open tasks" value={data.openTasksCount} />
        <StatCard
          label="Avg AI Response"
          value={data.avgResponse !== null ? `${data.avgResponse} sec` : '—'}
          valueColor={avgResponseColor}
        />
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-text">Today&apos;s meetings</h2>
        {data.todayMeetings.length === 0 ? (
          <p className="text-text/60">No meetings today. Enjoy the quiet.</p>
        ) : (
          <div className="space-y-3">
            {data.todayMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                id={meeting.id}
                clientName={getClientName(meeting.clients)}
                scheduledTime={meeting.scheduled_time}
                briefHref={`${briefBasePath}/${meeting.id}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-text">Upcoming meetings</h2>
        {data.upcomingMeetings.length === 0 ? (
          <p className="text-text/60">No upcoming meetings in the next 7 days.</p>
        ) : (
          <div className="space-y-3">
            {data.upcomingMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                id={meeting.id}
                clientName={getClientName(meeting.clients)}
                scheduledTime={meeting.scheduled_time}
                showDate
                briefHref={`${briefBasePath}/${meeting.id}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-text">Open tasks</h2>
          <Link href={tasksHref} className="text-sm text-blue hover:underline">
            View all
          </Link>
        </div>
        {data.tasks.length === 0 ? (
          <p className="text-text/60">All clear — no pending tasks.</p>
        ) : (
          <div className="space-y-3">
            {data.tasks.slice(0, 5).map((task) => (
              <TaskRow key={task.id} taskText={task.task_text} dueDate={task.due_date} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-text">Complaints</h2>
        {data.complaints.length === 0 ? (
          <p className="text-text/60">No open complaints.</p>
        ) : (
          <div className="space-y-3">
            {data.complaints.map((complaint) => (
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
