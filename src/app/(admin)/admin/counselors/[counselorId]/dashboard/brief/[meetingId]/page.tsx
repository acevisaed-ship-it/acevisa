import { notFound } from 'next/navigation'
import { BriefShell } from '@/components/brief/BriefShell'
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'
import type { AIProfileData, Client, Conversation, Document } from '@/types'

type Props = {
  params: Promise<{ counselorId: string; meetingId: string }>
}

export default async function AdminCounselorBriefPage({ params }: Props) {
  await requireAdmin()

  const { counselorId, meetingId } = await params
  const supabase = createAdminClient()

  const { data: counselor } = await supabase
    .from('counselors')
    .select('id, name, avatar_url, role, status')
    .eq('id', counselorId)
    .single()

  if (!counselor || counselor.role !== 'counselor' || counselor.status !== 'active') {
    notFound()
  }

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, client_id, counselor_id, scheduled_time')
    .eq('id', meetingId)
    .eq('counselor_id', counselorId)
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
      .eq('counselor_id', counselorId)
      .maybeSingle(),
  ])

  if (!client) notFound()

  const profile = (aiProfile?.profile_json as AIProfileData | null) ?? null

  return (
    <BriefShell
      meetingTime={meeting.scheduled_time}
      counselorId={counselor.id}
      counselorName={counselor.name}
      counselorAvatarUrl={counselor.avatar_url}
      initialOnline={counselorStatus?.is_online ?? false}
      initialAutoReply={counselorStatus?.auto_reply_enabled ?? false}
      client={client as Client}
      profile={profile}
      conversations={(conversations ?? []) as Conversation[]}
      documents={(documents ?? []) as Document[]}
    />
  )
}
