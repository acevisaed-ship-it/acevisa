import { redirect } from 'next/navigation'
import { StudentSidebar } from '@/components/student/StudentSidebar'
import { createAdminClient } from '@/lib/supabase/server'
import { formatPKTDate, formatPKTTime } from '@/lib/pkt'
import { CheckCircle2, Clock, FileText, MessageCircle, Calendar, ChevronRight } from 'lucide-react'

type Props = {
  searchParams: Promise<{ clientId?: string }>
}

const STAGE_INFO: Record<number, { label: string; description: string; color: string }> = {
  1: {
    label: 'Initial Consultation',
    description: 'Your case has been registered. Our AI assistant is learning about your goals and situation.',
    color: 'bg-[#2083B9]/10 text-[#2083B9] border-[#2083B9]/20',
  },
  2: {
    label: 'Documents Required',
    description: 'Your counselor has identified the documents needed for your application. Please upload them in My Documents.',
    color: 'bg-[#E48328]/10 text-[#E48328] border-[#E48328]/20',
  },
  3: {
    label: 'Documents Submitted',
    description: 'Your documents are with your counselor for review. We will let you know if anything else is needed.',
    color: 'bg-[#B7C733]/20 text-[#0A3F3A] border-[#B7C733]/30',
  },
  4: {
    label: 'Application In Progress',
    description: 'Your counselor is preparing your application. This stage can take several business days.',
    color: 'bg-[#2083B9]/10 text-[#2083B9] border-[#2083B9]/20',
  },
  5: {
    label: 'Submitted to Embassy',
    description: 'Your application has been submitted to the relevant embassy or institution. Processing times vary.',
    color: 'bg-[#E48328]/10 text-[#E48328] border-[#E48328]/20',
  },
  6: {
    label: 'Approved ✓',
    description: 'Congratulations — your application has been approved! Your counselor will contact you with next steps.',
    color: 'bg-[#B7C733]/30 text-[#0A3F3A] border-[#B7C733]/40',
  },
  7: {
    label: 'Rejected',
    description: 'Your application was not successful this time. Please speak to your counselor about next steps and appeal options.',
    color: 'bg-red-100 text-red-600 border-red-200',
  },
  8: {
    label: 'Closed',
    description: 'This case has been closed. Contact us if you would like to re-open or start a new application.',
    color: 'bg-[#0A3F3A]/10 text-[#0A3F3A]/60 border-[#0A3F3A]/10',
  },
}

const PIPELINE_STEPS = [1, 2, 3, 4, 5, 6] as const

export default async function StudentApplicationPage({ searchParams }: Props) {
  const { clientId } = await searchParams
  if (!clientId) redirect('/')

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, pipeline_stage, registration_date')
    .eq('id', clientId)
    .single()

  if (!client) redirect('/')

  const stage = (client.pipeline_stage as number) ?? 1
  const stageInfo = STAGE_INFO[stage] ?? STAGE_INFO[1]

  const [{ data: meetings }, { data: documents }, { count: messageCount }] = await Promise.all([
    supabase
      .from('meetings')
      .select('id, scheduled_time, status')
      .eq('client_id', clientId)
      .order('scheduled_time', { ascending: false }),
    supabase
      .from('documents')
      .select('id, document_name, status')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId),
  ])

  const docsUploaded = (documents ?? []).filter((d) => d.status !== 'requested').length
  const docsPending = (documents ?? []).filter((d) => d.status === 'requested').length

  return (
    <div className="flex min-h-screen">
      <StudentSidebar clientId={clientId} />
      <main className="flex-1 px-4 py-6 pt-20 lg:px-8 lg:pt-8">
        <h1 className="text-2xl font-semibold text-[#0A3F3A]">My Application</h1>
        <p className="mt-1 text-sm text-[#0A3F3A]/50">
          Track the progress of your visa application.
        </p>

        {/* Current status card */}
        <div className={`mt-6 rounded-2xl border p-5 ${stageInfo.color}`}>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-60">Current Status</p>
          <p className="mt-1 text-lg font-bold">{stageInfo.label}</p>
          <p className="mt-1 text-sm opacity-80">{stageInfo.description}</p>
        </div>

        {/* Progress tracker — only for stages 1–6 (not rejected/closed) */}
        {stage <= 6 && (
          <div className="mt-5 rounded-2xl border border-[#0A3F3A]/10 bg-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#0A3F3A]/40">Application Progress</p>
            <div className="flex items-center gap-0">
              {PIPELINE_STEPS.map((s, i) => {
                const done = stage > s
                const current = stage === s
                const info = STAGE_INFO[s]
                return (
                  <div key={s} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full items-center">
                      {i > 0 && (
                        <div className={`h-0.5 flex-1 ${done || current ? 'bg-[#B7C733]' : 'bg-[#0A3F3A]/10'}`} />
                      )}
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          done
                            ? 'bg-[#B7C733] text-[#0A3F3A]'
                            : current
                            ? 'bg-[#0A3F3A] text-white ring-2 ring-[#0A3F3A]/20'
                            : 'bg-[#0A3F3A]/10 text-[#0A3F3A]/30'
                        }`}
                      >
                        {done ? '✓' : s}
                      </div>
                      {i < PIPELINE_STEPS.length - 1 && (
                        <div className={`h-0.5 flex-1 ${done ? 'bg-[#B7C733]' : 'bg-[#0A3F3A]/10'}`} />
                      )}
                    </div>
                    <p className={`mt-1 text-center text-[9px] leading-tight ${current ? 'font-bold text-[#0A3F3A]' : 'text-[#0A3F3A]/40'}`}>
                      {info.label.replace(' ✓', '')}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[#0A3F3A]/10 bg-white p-4 text-center">
            <MessageCircle className="mx-auto h-5 w-5 text-[#2083B9]" />
            <p className="mt-2 text-lg font-bold text-[#0A3F3A]">{messageCount ?? 0}</p>
            <p className="text-[10px] text-[#0A3F3A]/50">Messages sent</p>
          </div>
          <div className="rounded-2xl border border-[#0A3F3A]/10 bg-white p-4 text-center">
            <Calendar className="mx-auto h-5 w-5 text-[#B7C733]" />
            <p className="mt-2 text-lg font-bold text-[#0A3F3A]">{(meetings ?? []).length}</p>
            <p className="text-[10px] text-[#0A3F3A]/50">Meetings</p>
          </div>
          <div className="rounded-2xl border border-[#0A3F3A]/10 bg-white p-4 text-center">
            <FileText className="mx-auto h-5 w-5 text-[#E48328]" />
            <p className="mt-2 text-lg font-bold text-[#0A3F3A]">{docsUploaded}</p>
            <p className="text-[10px] text-[#0A3F3A]/50">Docs uploaded</p>
          </div>
        </div>

        {/* Pending documents alert */}
        {docsPending > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#E48328]/20 bg-[#E48328]/5 px-4 py-3">
            <Clock className="h-4 w-4 shrink-0 text-[#E48328]" />
            <p className="flex-1 text-sm text-[#0A3F3A]">
              <span className="font-semibold">{docsPending} document{docsPending > 1 ? 's' : ''}</span> still needed — upload them in{' '}
              <a href={`/student/documents?clientId=${clientId}`} className="text-[#2083B9] underline">My Documents</a>.
            </p>
          </div>
        )}

        {/* Documents summary */}
        {(documents ?? []).length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#0A3F3A]/40">Documents</h2>
            <ul className="space-y-2">
              {(documents ?? []).map((doc) => {
                const isUploaded = doc.status !== 'requested'
                return (
                  <li key={doc.id} className="flex items-center gap-3 rounded-xl border border-[#0A3F3A]/10 bg-white px-4 py-3">
                    {isUploaded
                      ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#B7C733]" />
                      : <Clock className="h-4 w-4 shrink-0 text-[#E48328]/60" />
                    }
                    <span className="min-w-0 flex-1 truncate text-sm text-[#0A3F3A]">{doc.document_name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      doc.status === 'verified'
                        ? 'bg-[#B7C733]/20 text-[#0A3F3A]'
                        : doc.status === 'uploaded'
                        ? 'bg-[#2083B9]/10 text-[#2083B9]'
                        : 'bg-[#E48328]/10 text-[#E48328]'
                    }`}>
                      {doc.status === 'verified' ? 'Verified' : doc.status === 'uploaded' ? 'Under review' : 'Required'}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Meetings history */}
        {(meetings ?? []).length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#0A3F3A]/40">Meeting History</h2>
            <ul className="space-y-2">
              {(meetings ?? []).map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl border border-[#0A3F3A]/10 bg-white px-4 py-3">
                  <Calendar className="h-4 w-4 shrink-0 text-[#2083B9]" />
                  <span className="flex-1 text-sm text-[#0A3F3A]">
                    {formatPKTDate(m.scheduled_time)} · {formatPKTTime(m.scheduled_time)} PKT
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    m.status === 'completed'
                      ? 'bg-[#B7C733]/20 text-[#0A3F3A]'
                      : m.status === 'scheduled'
                      ? 'bg-[#2083B9]/10 text-[#2083B9]'
                      : 'bg-[#E48328]/10 text-[#E48328]'
                  }`}>
                    {m.status === 'completed' ? 'Completed' : m.status === 'scheduled' ? 'Upcoming' : 'Cancelled'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Registered since */}
        <p className="mt-8 text-center text-xs text-[#0A3F3A]/30">
          Case opened {formatPKTDate(client.registration_date)}
        </p>
      </main>
    </div>
  )
}
