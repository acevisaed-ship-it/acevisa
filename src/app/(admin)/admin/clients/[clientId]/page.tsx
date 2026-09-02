export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActivityHistorySection } from '@/components/brief/ActivityHistorySection'
import { RecentVisitsSection } from '@/components/brief/RecentVisitsSection'
import { ClassAttendanceSection, type ClassEnrollmentEntry } from '@/components/brief/ClassAttendanceSection'
import { BehavioralNotesSection } from '@/components/brief/BehavioralNotesSection'
import { ConversationDigestSection } from '@/components/brief/ConversationDigestSection'
import { DocumentsChecklistSection } from '@/components/brief/DocumentsChecklistSection'
import { ClientTasksSection, type ClientTask } from '@/components/brief/ClientTasksSection'
import {
  ClientProfileHeader,
  ProfileSummarySection,
} from '@/components/brief/ProfileSummarySection'
import { MeetingsHistorySection } from '@/components/brief/MeetingsHistorySection'
import { PsychologicalReadSection } from '@/components/brief/PsychologicalReadSection'
import { RemindersSection } from '@/components/brief/RemindersSection'
import { ServicePathwaySection } from '@/components/brief/ServicePathwaySection'
import { TalkingPointsSection } from '@/components/brief/TalkingPointsSection'
import { resolveAiProfile } from '@/lib/brief'
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'
import { taskAssigneeName } from '@/lib/supabase/relations'
import type { Client, Conversation, Document } from '@/types'
import { ClientControls } from '@/app/(counselor)/dashboard/clients/[clientId]/ClientControls'
import { ClientProfileHeaderActions } from '@/app/(counselor)/dashboard/clients/[clientId]/ClientProfileHeaderActions'
import { PendingProfileUpdates } from '@/app/(counselor)/dashboard/clients/[clientId]/PendingProfileUpdates'
import { PendingStageSuggestion } from '@/app/(counselor)/dashboard/clients/[clientId]/PendingStageSuggestion'
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
    { data: pendingStageSuggestions },
    { data: clientTasks, error: clientTasksError },
    { data: pendingInactiveRequest },
    { data: classEnrollments },
    { data: classAttendanceRows },
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
    supabase
      .from('stage_suggestions')
      .select('id, current_stage, suggested_stage, reason, created_at')
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('tasks')
      .select(
        `id, task_text, due_date, status, notes_count, negligence_flagged, counselor_id, ${taskAssigneeName}, task_actions(id, action_type, note_text, visibility, created_at, new_status, old_status, counselors(name))`
      )
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('client_inactive_requests')
      .select('id, requested_active, reason, created_at')
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .maybeSingle(),
    supabase
      .from('class_enrollments')
      .select('id, status, classes(name, subject)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('class_attendance')
      .select('enrollment_id, attended_on')
      .eq('client_id', clientId)
      .order('attended_on', { ascending: false }),
  ])

  if (clientTasksError) {
    console.error('[admin client profile] tasks fetch failed:', clientTasksError.message)
  }

  const { profile, isPartial: profilePartial } = resolveAiProfile(aiProfile)
  const score = typedClient.qualification_score ?? profile?.qualification_score ?? null
  const counselorName = assignedCounselor?.name ?? 'Unassigned'

  const recentVisits = (activityLog ?? []).filter((e) => e.action_type === 'walk_in') as unknown as {
    id: string
    created_at: string
    metadata: { note?: string; loggedByName?: string } | null
  }[]

  const attendanceByEnrollment = new Map<string, string[]>()
  for (const row of classAttendanceRows ?? []) {
    const list = attendanceByEnrollment.get(row.enrollment_id) ?? []
    list.push(row.attended_on)
    attendanceByEnrollment.set(row.enrollment_id, list)
  }
  const classAttendanceEntries: ClassEnrollmentEntry[] = (classEnrollments ?? []).map((e) => {
    const cls = e.classes as unknown as { name: string; subject: string | null } | null
    return {
      enrollmentId: e.id,
      className: cls?.name ?? 'Class',
      subject: cls?.subject ?? null,
      status: e.status,
      attendanceDates: attendanceByEnrollment.get(e.id) ?? [],
    }
  })

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/admin/clients"
            className="inline-flex items-center text-sm text-white/60 hover:text-white"
          >
            ← Back to all clients
          </Link>
        </div>

        {/* Chat / copy-link — portaled into the shared header next to the
            bell on desktop; rendered inline here on mobile. */}
        <ClientProfileHeaderActions
          clientId={clientId}
          chatHref={`/admin/clients/${clientId}/chat`}
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
              counselorName={counselorName}
              footer={
                <ClientControls
                  clientId={clientId}
                  initialStage={typedClient.pipeline_stage}
                  initialNotes={typedClient.notes ?? ''}
                  initialEmail={typedClient.email ?? null}
                  initialStatus={typedClient.status ?? 'active'}
                  initialManuallyQualified={typedClient.manually_qualified ?? false}
                  initialQualificationFactors={typedClient.qualification_factors ?? []}
                  initialPipelineActive={typedClient.pipeline_active ?? true}
                  pendingInactiveRequest={
                    pendingInactiveRequest
                      ? {
                          id: pendingInactiveRequest.id,
                          requestedActive: pendingInactiveRequest.requested_active,
                          reason: pendingInactiveRequest.reason,
                          createdAt: pendingInactiveRequest.created_at,
                        }
                      : null
                  }
                  isAdmin
                  isCeo={admin.role === 'ceo'}
                />
              }
            />
            <RemindersSection clientId={clientId} />
          </div>

          {/* Center panel — conversation and AI analysis */}
          <div className="scrollbar-hidden flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:px-1">
            <ConversationDigestSection
              conversations={(conversations ?? []) as Conversation[]}
              profile={profile}
            />
            <ServicePathwaySection profile={profile} />
            <PsychologicalReadSection profile={profile} />
            <BehavioralNotesSection clientId={clientId} />
            <TalkingPointsSection profile={profile} />
          </div>

          {/* Right panel — documents, meetings, and history */}
          <div className="scrollbar-hidden flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pl-1">
            <RecentVisitsSection visits={recentVisits} />
            <ClassAttendanceSection enrollments={classAttendanceEntries} />
            <DocumentsChecklistSection documents={(documents ?? []) as Document[]} clientId={clientId} />
            <MeetingsHistorySection clientId={clientId} meetings={meetings ?? []} />
            <ClientTasksSection
              clientId={clientId}
              clientName={typedClient.name}
              currentStaffId={admin.id}
              tasks={(clientTasks ?? []) as ClientTask[]}
            />
            <ActivityHistorySection entries={activityLog ?? []} />
          </div>
        </div>
      </div>
    </main>
  )
}
