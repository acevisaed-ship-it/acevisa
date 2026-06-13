import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActivityHistorySection } from '@/components/brief/ActivityHistorySection'
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
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'
import type { AIProfileData, Client, Conversation, Document } from '@/types'
import { ClientControls } from '@/app/(counselor)/dashboard/clients/[clientId]/ClientControls'
import { PendingProfileUpdates } from '@/app/(counselor)/dashboard/clients/[clientId]/PendingProfileUpdates'
import { CopyPortalLink } from '@/components/CopyPortalLink'

type Props = {
  params: Promise<{ clientId: string }>
}

export default async function AdminClientProfilePage({ params }: Props) {
  const { clientId } = await params
  await requireAdmin()

  const supabase = createAdminClient()

  const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single()

  if (!client) notFound()

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
      .select('profile_json')
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
  ])

  const profile = (aiProfile?.profile_json as AIProfileData | null) ?? null
  const score = typedClient.qualification_score ?? profile?.qualification_score ?? null
  const counselorName = assignedCounselor?.name ?? 'Unassigned'

  return (
    <main className="flex-1 bg-bg p-4 md:p-8">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/admin/clients"
            className="inline-flex items-center text-sm text-blue hover:underline"
          >
            ← Back to all clients
          </Link>
          <CopyPortalLink clientId={clientId} />
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
          counselorName={counselorName}
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
        <TalkingPointsSection profile={profile} />
        <DocumentsChecklistSection documents={(documents ?? []) as Document[]} clientId={clientId} />
        <MeetingsHistorySection clientId={clientId} meetings={meetings ?? []} />
        <ActivityHistorySection entries={activityLog ?? []} />
      </div>
    </main>
  )
}
