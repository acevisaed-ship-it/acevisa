import { redirect } from 'next/navigation'
import { StudentSidebar } from '@/components/student/StudentSidebar'
import { createAdminClient } from '@/lib/supabase/server'
import { formatPKTDate } from '@/lib/pkt'
import { MessageCircle, Calendar, FileText, CheckCircle2, Clock, UserCheck } from 'lucide-react'
import Link from 'next/link'

type Props = {
  searchParams: Promise<{ clientId?: string }>
}

function StatusBadge({ stage }: { stage: string }) {
  const map: Record<string, { label: string; class: string }> = {
    initial_consultation: { label: 'Initial Consultation', class: 'bg-[#2083B9]/10 text-[#2083B9]' },
    documents_required: { label: 'Documents Required', class: 'bg-[#E48328]/15 text-[#E48328]' },
    documents_submitted: { label: 'Documents Submitted', class: 'bg-[#B7C733]/20 text-[#0A3F3A]' },
    application_in_progress: { label: 'Application In Progress', class: 'bg-[#2083B9]/10 text-[#2083B9]' },
    submitted_to_embassy: { label: 'Submitted to Embassy', class: 'bg-[#E48328]/15 text-[#E48328]' },
    approved: { label: 'Approved ✓', class: 'bg-[#B7C733]/30 text-[#0A3F3A] font-bold' },
    rejected: { label: 'Rejected', class: 'bg-red-100 text-red-600' },
    closed: { label: 'Closed', class: 'bg-[#0A3F3A]/10 text-[#0A3F3A]/60' },
  }
  const s = map[stage] ?? { label: stage.replace(/_/g, ' '), class: 'bg-[#0A3F3A]/10 text-[#0A3F3A]' }
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${s.class}`}>
      {s.label}
    </span>
  )
}

export default async function StudentPortalPage({ searchParams }: Props) {
  const { clientId } = await searchParams
  if (!clientId) redirect('/')

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, pipeline_stage, created_at, counselors(name)')
    .eq('id', clientId)
    .single()

  if (!client) redirect('/')

  const [{ data: meetings }, { data: documents }, { data: tasks }] = await Promise.all([
    supabase
      .from('meetings')
      .select('id, scheduled_time, status')
      .eq('client_id', clientId)
      .order('scheduled_time', { ascending: false })
      .limit(3),
    supabase
      .from('documents')
      .select('id, document_name, status')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('tasks')
      .select('id, title, status')
      .eq('client_id', clientId)
      .neq('status', 'completed')
      .limit(5),
  ])

  const counselorRaw = client.counselors as { name: string } | { name: string }[] | null
  const counselorName = Array.isArray(counselorRaw) ? counselorRaw[0]?.name : counselorRaw?.name

  const stageMap: Record<number, string> = {
    1: 'initial_consultation',
    2: 'documents_required',
    3: 'documents_submitted',
    4: 'application_in_progress',
    5: 'submitted_to_embassy',
    6: 'approved',
    7: 'rejected',
    8: 'closed',
  }
  const currentStage = stageMap[client.pipeline_stage ?? 1] ?? 'initial_consultation'

  const nextMeeting = (meetings ?? []).find((m) => m.status === 'scheduled')
  const pendingDocs = (documents ?? []).filter((d) => d.status === 'requested').length
  const openTasks = (tasks ?? []).length

  return (
    <div className="flex min-h-screen">
      <StudentSidebar clientId={clientId} />
      <main className="flex-1 px-4 py-6 pt-20 lg:px-8 lg:pt-8">
        {/* Welcome */}
        <div className="rounded-2xl bg-[#0A3F3A] p-6 text-white">
          <p className="text-sm text-white/60">Welcome back,</p>
          <h1 className="mt-0.5 text-2xl font-bold">{client.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge stage={currentStage} />
            {counselorName && (
              <span className="flex items-center gap-1.5 text-xs text-white/60">
                <UserCheck className="h-3.5 w-3.5" />
                {counselorName}
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-white/40">
            Client since {formatPKTDate(client.created_at)}
          </p>
        </div>

        {/* Quick stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[#0A3F3A]/10 bg-white p-4">
            <Calendar className="h-5 w-5 text-[#2083B9]" />
            <p className="mt-2 text-lg font-bold text-[#0A3F3A]">{(meetings ?? []).length}</p>
            <p className="text-xs text-[#0A3F3A]/50">Total meetings</p>
          </div>
          <div className="rounded-2xl border border-[#0A3F3A]/10 bg-white p-4">
            <FileText className="h-5 w-5 text-[#E48328]" />
            <p className="mt-2 text-lg font-bold text-[#0A3F3A]">{pendingDocs}</p>
            <p className="text-xs text-[#0A3F3A]/50">Documents needed</p>
          </div>
          <div className="rounded-2xl border border-[#0A3F3A]/10 bg-white p-4">
            <Clock className="h-5 w-5 text-[#B7C733]" />
            <p className="mt-2 text-lg font-bold text-[#0A3F3A]">{openTasks}</p>
            <p className="text-xs text-[#0A3F3A]/50">Pending actions</p>
          </div>
        </div>

        {/* Next meeting */}
        {nextMeeting && (
          <div className="mt-5 rounded-2xl border border-[#2083B9]/20 bg-[#2083B9]/5 p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#2083B9]" />
              <p className="text-sm font-semibold text-[#0A3F3A]">Next meeting</p>
            </div>
            <p className="mt-1 text-sm text-[#0A3F3A]/70">
              {formatPKTDate(nextMeeting.scheduled_time)}
            </p>
          </div>
        )}

        {/* Pending documents */}
        {pendingDocs > 0 && (
          <div className="mt-4 rounded-2xl border border-[#E48328]/20 bg-[#E48328]/5 p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#E48328]" />
              <p className="text-sm font-semibold text-[#0A3F3A]">
                {pendingDocs} document{pendingDocs > 1 ? 's' : ''} requested
              </p>
            </div>
            <Link
              href={`/student/documents?clientId=${clientId}`}
              className="mt-1 block text-xs text-[#2083B9] underline"
            >
              View documents →
            </Link>
          </div>
        )}

        {/* Open tasks */}
        {openTasks > 0 && (
          <div className="mt-4">
            <h2 className="mb-2 text-sm font-semibold text-[#0A3F3A]">Action items</h2>
            <ul className="space-y-2">
              {(tasks ?? []).map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-[#0A3F3A]/10 bg-white px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#0A3F3A]/30" />
                  <span className="text-sm text-[#0A3F3A]/80">{t.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick links */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href={`/student/chat?clientId=${clientId}`}
            className="flex items-center gap-3 rounded-2xl bg-[#0A3F3A] px-4 py-4 text-white hover:opacity-90"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-semibold">Open Chat</span>
          </Link>
          <Link
            href={`/student/documents?clientId=${clientId}`}
            className="flex items-center gap-3 rounded-2xl border border-[#0A3F3A]/15 bg-white px-4 py-4 text-[#0A3F3A] hover:bg-[#0A3F3A]/5"
          >
            <FileText className="h-5 w-5" />
            <span className="text-sm font-semibold">Documents</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
