import Link from 'next/link'
import { formatPKTDateLong, getPKTGreeting } from '@/lib/pkt'
import type { CounselorDashboardData } from '@/lib/dashboard/getCounselorDashboardData'
import { MeetingCard } from '@/components/dashboard/MeetingCard'
import { StatCard } from '@/components/dashboard/StatCard'
import { CollapsableTasksCard } from '@/components/dashboard/CollapsableTasksCard'
import { ComplaintRow } from '@/components/dashboard/ComplaintRow'
import { AttendanceClock } from '@/components/dashboard/AttendanceClock'
import { StaffAppInstallCard } from '@/components/StaffAppInstallCard'

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
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          {getPKTGreeting()}, {data.counselorName}
        </h1>
        <p className="mt-1 text-sm text-white/60">{formatPKTDateLong()}</p>
      </header>

      <div className="mb-6 max-w-xs">
        <AttendanceClock />
      </div>

      <StaffAppInstallCard className="mb-8 max-w-2xl" />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Meetings today" value={data.meetingsTodayCount} />
        <StatCard
          label="Pending today"
          value={data.tasksDueTodayCount}
          valueColor={data.tasksDueTodayCount > 0 ? 'orange' : 'default'}
        />
        <StatCard label="Qualified leads" value={data.qualifiedLeadsCount} />
        <StatCard label="Open tasks" value={data.openTasksCount} />
        <StatCard
          label="Avg AI Response"
          value={data.avgResponse !== null ? `${data.avgResponse} sec` : '—'}
          valueColor={avgResponseColor}
        />
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-white">Today&apos;s meetings</h2>
        {data.todayMeetings.length === 0 ? (
          <p className="text-white/50">No meetings today. Enjoy the quiet.</p>
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
        <h2 className="mb-4 text-lg font-bold text-white">Upcoming meetings</h2>
        {data.upcomingMeetings.length === 0 ? (
          <p className="text-white/50">No upcoming meetings in the next 7 days.</p>
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

      <CollapsableTasksCard
        tasks={data.tasksDueToday}
        tasksHref={tasksHref}
        title="Today's pending tasks"
        emptyLabel="All clear — nothing pending today."
      />

      <section>
        <h2 className="mb-4 text-lg font-bold text-white">Complaints</h2>
        {data.complaints.length === 0 ? (
          <p className="text-white/50">No open complaints.</p>
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
