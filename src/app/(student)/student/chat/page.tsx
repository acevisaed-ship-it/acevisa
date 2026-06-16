import { redirect } from 'next/navigation'
import { ChatLayout } from '@/components/chat/ChatLayout'
import { createAdminClient } from '@/lib/supabase/server'

type Props = {
  searchParams: Promise<{ clientId?: string }>
}

export default async function StudentChatPage({ searchParams }: Props) {
  const { clientId } = await searchParams
  if (!clientId) redirect('/')

  const supabase = createAdminClient()

  const [clientRes, meetingsRes] = await Promise.all([
    supabase
      .from('clients')
      .select('name, phone, email, city, pipeline_stage, counselor_id, target_country, interested_in')
      .eq('id', clientId)
      .single(),
    supabase
      .from('meetings')
      .select('id, scheduled_time, status, counselor_id')
      .eq('client_id', clientId)
      .order('scheduled_time', { ascending: false })
      .limit(10),
  ])

  const client = clientRes.data
  if (!client) redirect('/')

  let counselorName: string | null = null
  if (client.counselor_id) {
    const { data: counselor } = await supabase
      .from('counselors')
      .select('name')
      .eq('id', client.counselor_id)
      .single()
    counselorName = counselor?.name ?? null
  }

  return (
    <ChatLayout
      clientId={clientId}
      clientName={client.name}
      initialStage={client.pipeline_stage ?? 1}
      initialClient={{
        name: client.name,
        phone: client.phone,
        email: client.email ?? null,
        city: client.city ?? null,
        target_country: client.target_country ?? null,
        interested_in: client.interested_in ?? null,
        pipeline_stage: client.pipeline_stage ?? 1,
      }}
      counselorName={counselorName}
      initialMeetings={(meetingsRes.data ?? []) as {
        id: string
        scheduled_time: string
        status: 'scheduled' | 'completed' | 'cancelled'
        counselor_id: string
      }[]}
    />
  )
}
