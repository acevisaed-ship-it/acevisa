import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { MeetingCard } from '@/components/dashboard/MeetingCard'
import { formatPKTDateLong } from '@/lib/pkt'

type MeetingRow = {
  id: string
  scheduled_time: string
  status: string
  clients: { name: string } | { name: string }[] | null
}

function getClientName(clients: MeetingRow['clients']): string {
  if (!clients) return 'Unknown client'
  if (Array.isArray(clients)) return clients[0]?.name ?? 'Unknown client'
  return clients.name
}

export default async function CounselorMeetingsPage() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return null
  const supabase = createAdminClient()

  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, scheduled_time, status, clients(name)')
    .eq('counselor_id', counselor.id)
    .order('scheduled_time', { ascending: true })

  const rows = (meetings ?? []) as MeetingRow[]

  return (
    <main className="flex-1 p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-white md:text-3xl">Meetings</h1>
      <p className="mt-1 text-sm text-white/50">{formatPKTDateLong()}</p>

      <div className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-white/50">No meetings scheduled yet.</p>
        ) : (
          rows.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              id={meeting.id}
              clientName={getClientName(meeting.clients)}
              scheduledTime={meeting.scheduled_time}
              briefHref={`/dashboard/brief/${meeting.id}`}
            />
          ))
        )}
      </div>
    </main>
  )
}
