export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActivityHistorySection } from '@/components/brief/ActivityHistorySection'
import { RecentVisitsSection } from '@/components/brief/RecentVisitsSection'
import { BehavioralNotesSection } from '@/components/brief/BehavioralNotesSection'
import { BriefCard } from '@/components/brief/BriefCard'
import { ConversationDigestSection } from '@/components/brief/ConversationDigestSection'
import { DocumentsChecklistSection } from '@/components/brief/DocumentsChecklistSection'
import { ApplicationsSection } from '@/components/brief/ApplicationsSection'
import { MeetingsHistorySection } from '@/components/brief/MeetingsHistorySection'
import {
  ClientProfileHeader,
  ProfileSummarySection,
} from '@/components/brief/ProfileSummarySection'
import { PsychologicalReadSection } from '@/components/brief/PsychologicalReadSection'
import { RemindersSection } from '@/components/brief/RemindersSection'
import { ServicePathwaySection } from '@/components/brief/ServicePathwaySection'
import { StrategyChat } from '@/components/brief/StrategyChat'
import { TalkingPointsSection } from '@/components/brief/TalkingPointsSection'
import { resolveAiProfile } from '@/lib/brief'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import type { Client, Conversation, Document } from '@/types'
import { ClientControls } from './ClientControls'
import { ClientProfileHeaderActions } from './ClientProfileHeaderActions'
import { PendingProfileUpdates } from './PendingProfileUpdates'
import { PendingStageSuggestion } from './PendingStageSuggestion'
import { RegenerateProfileButton } from '@/components/brief/RegenerateProfileButton'

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
    { data: applications },
    { data: pendingStageSuggestions },
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
      .from('activity_logs')
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
    supabase.from('applications').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    supabase
      .from('stage_suggestions')
      .select('id, current_stage, suggested_stage, reason, created_at')
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  const { profile, isPartial: profilePartial } = resolveAiProfile(aiProfile)
  const score = typedClient.qualification_score ?? profile?.qualification_score ?? null

  const recentVisits = (activityLog ?? []).filter((e) => e.action_type === 'walk_in') as unknown as {
    id: string
    created_at: string
    metadata: { note?: string; loggedByName?: string } | null
  }[]

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-[1500px]">
        {/* Top bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-white/60 hover:text-white"
          >
            ← Back to dashboard
          </Link>
        </div>

        {/* Online toggle / chat / copy-link — portaled into the shared
            header next to the bell on desktop; rendered inline here on
            mobile where the shared header has no room. */}
        <ClientProfileHeaderActions
          clientId={clientId}
          chatHref={`/dashboard/clients/${clientId}/chat`}
          counselorId={counselor.id}
          initialOnline={counselorStatus?.is_online ?? false}
          initialAutoReply={counselorStatus?.auto_reply_enabled ?? false}
        />

        <div className="flex items-center justify-between">
          <ClientProfileHeader client={typedClient} score={score} />
          <RegenerateProfileButton clientId={clientId} />
        </div>

        {/* 3-panel layout, same structure as the student chat / Team Hub
            views: fixed-height row on desktop with each panel scrolling
            independently (scrollbar hidden, scroll still works), so no
            single column ever runs the length of the page — it stacks to
            one column on mobile. */}
        <div className="mt-4 grid grid-cols-1 gap-5 lg:h-[calc(100vh-220px)] lg:grid-cols-[30%_40%_30%]">
          {/* Left panel — approvals + core profile controls */}
          <div className="scrollbar-hidden flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <PendingProfileUpdates
              updates={(pendingUpdates ?? []).map((u) => ({
                ...u,
                proposed_changes: u.proposed_changes as Record<string, string>,
                reviewed_fields: (u.reviewed_fields ?? {}) as Record<string, string>,
              }))}
            />
            <PendingStageSuggestion suggestions={pendingStageSuggestions ?? []} />
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
                  initialEmail={typedClient.email ?? null}
                  initialStatus={typedClient.status ?? 'active'}
                  initialManuallyQualified={typedClient.manually_qualified ?? false}
                  initialQualificationFactors={typedClient.qualification_factors ?? []}
                />
              }
            />
            <RemindersSection clientId={clientId} />
          </div>

          {/* Center panel — conversation, strategy, and AI analysis */}
          <div className="scrollbar-hidden flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:px-1">
            <ConversationDigestSection
              conversations={(conversations ?? []) as Conversation[]}
              profile={profile}
            />
            <BriefCard>
              <div className="flex min-h-[50vh] flex-col lg:min-h-0">
                <StrategyChat clientId={clientId} clientName={typedClient.name} />
              </div>
            </BriefCard>
            <ServicePathwaySection profile={profile} />
            <PsychologicalReadSection profile={profile} />
            <BehavioralNotesSection clientId={clientId} />
            <TalkingPointsSection profile={profile} />
          </div>

          {/* Right panel — documents, applications, meetings, and history */}
          <div className="scrollbar-hidden flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pl-1">
            <RecentVisitsSection visits={recentVisits} />
            <DocumentsChecklistSection documents={(documents ?? []) as Document[]} clientId={clientId} />
            <ApplicationsSection clientId={clientId} applications={applications ?? []} />
            <MeetingsHistorySection clientId={clientId} meetings={meetings ?? []} />
            <ActivityHistorySection entries={activityLog ?? []} />
          </div>
        </div>
      </div>
    </main>
  )
}
