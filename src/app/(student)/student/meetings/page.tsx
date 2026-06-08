import { redirect } from 'next/navigation'
import { StudentSidebar } from '@/components/student/StudentSidebar'
import { createAdminClient } from '@/lib/supabase/server'
import { formatPKTDate, formatPKTTime } from '@/lib/pkt'
import type { Meeting } from '@/types'

type Props = {
  searchParams: Promise<{ clientId?: string }>
}

function statusLabel(status: Meeting['status']) {
  switch (status) {
    case 'scheduled':
      return 'Scheduled'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
  }
}

function statusClass(status: Meeting['status']) {
  switch (status) {
    case 'scheduled':
      return 'bg-[#2083B9]/10 text-[#2083B9]'
    case 'completed':
      return 'bg-[#B7C733]/20 text-[#0A3F3A]'
    case 'cancelled':
      return 'bg-[#E48328]/10 text-[#E48328]'
  }
}

export default async function StudentMeetingsPage({ searchParams }: Props) {
  const { clientId } = await searchParams
  if (!clientId) redirect('/')

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .single()

  if (!client) redirect('/')

  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .eq('client_id', clientId)
    .order('scheduled_time', { ascending: false })

  const meetingRows = (meetings ?? []) as Meeting[]

  return (
    <div className="flex min-h-screen">
      <StudentSidebar clientId={clientId} />
      <main className="flex-1 px-4 py-6 pt-20 lg:px-8 lg:pt-8">
        <h1 className="text-2xl font-semibold text-[#0A3F3A]">My Meetings</h1>

        {meetingRows.length === 0 ? (
          <p className="mt-6 text-sm text-[#0A3F3A]/70">
            No meetings scheduled yet. Book one from your chat.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {meetingRows.map((meeting) => (
              <li
                key={meeting.id}
                className="rounded-2xl border border-[#0A3F3A]/10 bg-white/80 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#0A3F3A]">
                      {formatPKTDate(meeting.scheduled_time)} · {formatPKTTime(meeting.scheduled_time)} PKT
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(meeting.status)}`}
                  >
                    {statusLabel(meeting.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
