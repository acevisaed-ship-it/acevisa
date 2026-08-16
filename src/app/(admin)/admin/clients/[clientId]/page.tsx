export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActivityHistorySection } from '@/components/brief/ActivityHistorySection'
import { RecentVisitsSection } from '@/components/brief/RecentVisitsSection'
import { BehavioralNotesSection } from '@/components/brief/BehavioralNotesSection'
import { ConversationDigestSection } from '@/components/brief/ConversationDigestSection'
import { DocumentsChecklistSection } from '@/components/brief/DocumentsChecklistSection'
import {
  ClientProfileHeader,
  ProfileSummarySection,
} from '@/components/brief/ProfileSummarySection'
import { MeetingsHistorySection } from '@/components/brief/MeetingsHistorySection'
import { PsychologicalReadSection } from '@/components/brief/PsychologicalReadSection'
import { ServicePathwaySection } from '@/components/brief/ServicePathwaySection'
import { TalkingPointsSection } from '@/components/brief/TalkingPointsSection'
import { resolveAiProfile } from '@/lib/brief'
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'
import type { Client, Conversation, Document } from '@/types'
import { ClientControls } from '@/app/(counselor)/dashboard/clients/[clientId]/ClientControls'
import { PendingProfileUpdates } from '@/app/(counselor)/dashboard/clients/[clientId]/PendingProfileUpdates'
import { CopyPortalLink } from '@/components/CopyPortalLink'
import { RegenerateProfileButton } from '@/components/brief/RegenerateProfileButton'

type Props = {
  params: Promise<{ clientId: string }>
}

export default async function AdminClientProfilePage({ params }: Props) {
  const { clientId } = await params
  const admin = await requireAdmin()

  const supabase = createAdminClient()

  const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single()

  if (!client) notFound()
  // CEO and Branch Manager admins can both view any client's full details,
  // regardless of branch — branch scoping stays in effect for list/count
  // views elsewhere, this is specifically the detail page.

  const typedClient = client as Client

  const [
    { data: assignedCounselor },
    { data: aiProfile },
    { data: conversations },
    { data: documents },
    { data: meetings },
    { data: activityLog },
    { data: pendingUpdates },
  ] = await Promise.all([
    typedClient.counselor_id
      ? supabase
          .from('counselors')
          .select('name')
          .eq('id', typedClient.counselor_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
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
  ])

  const { profile, isPartial: profilePartial } = resolveAiProfile(aiProfile)
  const score = typedClient.qualification_score ?? profile?.qualification_score ?? null
  const counselorName = assignedCounselor?.name ?? 'Unassigned'

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/admin/clients"
            className="inline-flex items-center text-sm text-white/60 hover:text-white"
          >
            ← Back to all clients
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/clients/${clientId}/chat`}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(145deg, #f5a24e 0%, #E48328 55%, #ca7220 100%)' }}
            >
              💬 Chat with Student
            </Link>
            <CopyPortalLink clientId={clientId} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <ClientProfileHeader client={typedClient} score={score} />
          <RegenerateProfileButton clientId={clientId} />
        </div>

        <PendingProfileUpdates
          updates={(pendingUpdates ?? []).map((u) => ({
            ...u,
            proposed_changes: u.proposed_changes as Record<string, string>,
            reviewed_fields: (u.reviewed_fields ?? {}) as Record<string, string>,
          }))}
        />

        <RecentVisitsSection
          visits={(activityLog ?? []).filter((e) => e.action_type === 'walk_in') as unknown as {
            id: string
            created_at: string
            metadata: { note?: string; loggedByName?: string } | null
          }[]}
        />

        <ProfileSummarySection
          client={typedClient}
          profile={profile}
          profilePartial={profilePartial}
          counselorName={counselorName}
          footer={
            <ClientControls
              clientId={clientId}
              initialStage={typedClient.pipeline_stage}
              initialNotes={typedClient.notes ?? ''}
              initialEmail={typedClient.email ?? null}
              initialStatus={typedClient.status ?? 'active'}
              isAdmin
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
      </div>
    </main>
  )
}
