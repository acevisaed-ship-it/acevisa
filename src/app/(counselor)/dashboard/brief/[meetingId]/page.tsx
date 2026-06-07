import { notFound } from 'next/navigation'
import { BriefShell } from '@/components/brief/BriefShell'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import type { AIProfileData, Client, Conversation, Document } from '@/types'

type Props = {
  params: Promise<{ meetingId: string }>
}

export default async function BriefPage({ params }: Props) {
  const { meetingId } = await params
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return null

  const supabase = createAdminClient()

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, client_id, counselor_id, scheduled_time')
    .eq('id', meetingId)
    .eq('counselor_id', counselor.id)
    .single()

  if (!meeting) notFound()

  const [
    { data: client },
    { data: aiProfile },
    { data: conversations },
    { data: documents },
    { data: counselorStatus },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', meeting.client_id).single(),
    supabase
      .from('ai_profiles')
      .select('profile_json')
      .eq('client_id', meeting.client_id)
      .maybeSingle(),
    supabase
      .from('conversations')
      .select('*')
      .eq('client_id', meeting.client_id)
      .order('timestamp', { ascending: true }),
    supabase.from('documents').select('*').eq('client_id', meeting.client_id),
    supabase
      .from('counselor_status')
      .select('is_online, auto_reply_enabled')
      .eq('counselor_id', counselor.id)
      .maybeSingle(),
  ])

  if (!client) notFound()

  const profile = (aiProfile?.profile_json as AIProfileData | null) ?? null

  return (
    <BriefShell
      meetingTime={meeting.scheduled_time}
      counselorId={counselor.id}
      initialOnline={counselorStatus?.is_online ?? false}
      initialAutoReply={counselorStatus?.auto_reply_enabled ?? false}
      client={client as Client}
      profile={profile}
      conversations={(conversations ?? []) as Conversation[]}
      documents={(documents ?? []) as Document[]}
    />
  )
}
