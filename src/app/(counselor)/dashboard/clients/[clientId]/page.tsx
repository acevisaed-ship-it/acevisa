import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActivityHistorySection } from '@/components/brief/ActivityHistorySection'
import { BehavioralNotesSection } from '@/components/brief/BehavioralNotesSection'
import { BriefCard } from '@/components/brief/BriefCard'
import { ConversationDigestSection } from '@/components/brief/ConversationDigestSection'
import { DocumentsChecklistSection } from '@/components/brief/DocumentsChecklistSection'
import { MeetingsHistorySection } from '@/components/brief/MeetingsHistorySection'
import { OnlineStatusToggle } from '@/components/brief/OnlineStatusToggle'
import {
  ClientProfileHeader,
  ProfileSummarySection,
} from '@/components/brief/ProfileSummarySection'
import { PsychologicalReadSection } from '@/components/brief/PsychologicalReadSection'
import { ServicePathwaySection } from '@/components/brief/ServicePathwaySection'
import { StrategyChat } from '@/components/brief/StrategyChat'
import { TalkingPointsSection } from '@/components/brief/TalkingPointsSection'
import { resolveAiProfile } from '@/lib/brief'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import type { Client, Conversation, Document } from '@/types'
import { ClientControls } from './ClientControls'
import { PendingProfileUpdates } from './PendingProfileUpdates'
import { CopyPortalLink } from '@/components/CopyPortalLink'

type Props = {
  params: Promise<{ clientId: string }>
}

export default async function ClientRecordPage({ params }: Props) {
  const { clientId } = await params
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return null

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('counselor_id', counselor.id)
    .single()

  if (!client) notFound()

  const typedClient = client as Client

  const [
    { data: aiProfile },
    { data: conversations },
    { data: documents },
    { data: meetings },
    { data: activityLog },
    { data: pendingUpdates },
    { data: counselorStatus },
  ] = await Promise.all([
    supabase
      .from('ai_profiles')
      .select(
        'profile_json, stage, qualification_score, detected_language, detected_region, detected_fears, detected_behaviour_type, service_match'
      )
      .eq('client_id', clientId)
      .maybeSingle(),
    supabase
      .from('conversations')
      .select('*')
      .eq('client_id', clientId)
      .order('timestamp', { ascending: true }),
    supabase.from('documents').select('*').eq('client_id', clientId),
    supabase
      .from('meetings')
      .select('*, counselors(name)')
      .eq('client_id', clientId)
      .order('scheduled_time', { ascending: false }),
    supabase
      .from('student_activity_log')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('profile_update_requests')
      .select('id, triggered_by_message, proposed_changes, reviewed_fields, created_at')
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('counselor_status')
      .select('is_online, auto_reply_enabled')
      .eq('counselor_id', counselor.id)
      .maybeSingle(),
  ])

  const { profile, isPartial: profilePartial } = resolveAiProfile(aiProfile)
  const score = typedClient.qualification_score ?? profile?.qualification_score ?? null

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-[900px]">
        {/* Top bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-white/60 hover:text-white"
          >
            ← Back to dashboard
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <OnlineStatusToggle
              counselorId={counselor.id}
              initialOnline={counselorStatus?.is_online ?? false}
              initialAutoReply={counselorStatus?.auto_reply_enabled ?? false}
            />
            <Link
              href={`/dashboard/clients/${clientId}/chat`}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(145deg, #f5a24e 0%, #E48328 55%, #ca7220 100%)' }}
            >
              💬 Chat with Student
            </Link>
            <CopyPortalLink clientId={clientId} />
          </div>
        </div>

        <ClientProfileHeader client={typedClient} score={score} />

        <PendingProfileUpdates
          updates={(pendingUpdates ?? []).map((u) => ({
            ...u,
            proposed_changes: u.proposed_changes as Record<string, string>,
            reviewed_fields: (u.reviewed_fields ?? {}) as Record<string, string>,
          }))}
        />

        <ProfileSummarySection
          client={typedClient}
          profile={profile}
          profilePartial={profilePartial}
          counselorName={counselor.name}
          footer={
            <ClientControls
              clientId={clientId}
              initialStage={typedClient.pipeline_stage}
              initialNotes={typedClient.notes ?? ''}
            />
          }
        />

        <ConversationDigestSection
          conversations={(conversations ?? []) as Conversation[]}
          profile={profile}
        />
        <ServicePathwaySection profile={profile} />
        <PsychologicalReadSection profile={profile} />
        <BehavioralNotesSection clientId={clientId} />
        <TalkingPointsSection profile={profile} />
        <DocumentsChecklistSection documents={(documents ?? []) as Document[]} clientId={clientId} />
        <MeetingsHistorySection clientId={clientId} meetings={meetings ?? []} />
        <ActivityHistorySection entries={activityLog ?? []} />

        {/* Strategy Assistant — formerly only on brief page */}
        <BriefCard>
          <div className="flex min-h-[50vh] flex-col lg:min-h-0">
            <StrategyChat clientId={clientId} clientName={typedClient.name} />
          </div>
        </BriefCard>
      </div>
    </main>
  )
}
