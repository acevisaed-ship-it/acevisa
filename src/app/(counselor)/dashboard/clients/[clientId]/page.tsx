import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { getPipelineStageLabel, getScoreBadgeColor } from '@/lib/brief'
import {
  formatPKTDate,
  formatPKTRegistrationDate,
  formatPKTTime,
} from '@/lib/pkt'
import type { Client, Document, Escalation, Meeting, Task } from '@/types'
import { ClientControls } from './ClientControls'

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
    { data: meetings },
    { data: tasks },
    { data: escalations },
    { data: documents },
  ] = await Promise.all([
    supabase
      .from('meetings')
      .select('*')
      .eq('client_id', clientId)
      .order('scheduled_time', { ascending: false }),
    supabase
      .from('tasks')
      .select('*')
      .eq('client_id', clientId)
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('escalations')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'open')
      .order('timestamp', { ascending: false }),
    supabase
      .from('documents')
      .select('*')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false }),
  ])

  const meetingRows = (meetings ?? []) as Meeting[]
  const latestMeeting = meetingRows[0]

  const score = typedClient.qualification_score
  const scoreColor =
    score !== null && score > 0 ? getScoreBadgeColor(score) : null

  return (
    <main className="flex-1 p-6 md:p-8">
      <Link
        href="/dashboard/pipeline"
        className="mb-4 inline-flex items-center text-sm text-blue hover:underline"
      >
        ← Back to pipeline
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-blue md:text-3xl">
        {typedClient.name}
      </h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-text/10 bg-white p-5">
          <h2 className="mb-4 text-lg font-bold text-text">Client info</h2>

          <dl className="space-y-3 text-sm">
            <InfoRow label="Phone" value={typedClient.phone} />
            <InfoRow label="City" value={typedClient.city ?? '—'} />
            <InfoRow
              label="Language"
              value={typedClient.language}
              capitalize
            />
            <InfoRow label="Ad source" value={typedClient.ad_source ?? '—'} />
            <InfoRow
              label="Registration date"
              value={
                typedClient.registration_date
                  ? formatPKTRegistrationDate(typedClient.registration_date)
                  : '—'
              }
            />
            <InfoRow
              label="Pipeline stage"
              value={`Stage ${typedClient.pipeline_stage} — ${getPipelineStageLabel(typedClient.pipeline_stage)}`}
            />
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text/60">Qualification score</dt>
              <dd className="font-medium text-text">
                {score !== null && score > 0 ? (
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: scoreColor! }}
                  >
                    {score}
                  </span>
                ) : (
                  '—'
                )}
              </dd>
            </div>
          </dl>

          <ClientControls
            clientId={clientId}
            initialStage={typedClient.pipeline_stage}
            initialNotes={typedClient.notes ?? ''}
          />
        </section>

        <section className="space-y-6">
          <ActivityBlock title="Meetings">
            {meetingRows.length === 0 ? (
              <EmptyState text="No meetings yet." />
            ) : (
              <ul className="space-y-2">
                {meetingRows.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-xl bg-bg px-4 py-3 text-sm"
                  >
                    <span className="font-medium capitalize text-text">
                      {m.status}
                    </span>
                    <span className="text-text/60">
                      {' '}
                      · {formatPKTDate(m.scheduled_time)}{' '}
                      {formatPKTTime(m.scheduled_time)} PKT
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ActivityBlock>

          <ActivityBlock title="Tasks">
            {(tasks ?? []).length === 0 ? (
              <EmptyState text="No tasks for this client." />
            ) : (
              <ul className="space-y-2">
                {(tasks as Task[]).map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl bg-bg px-4 py-3 text-sm"
                  >
                    <p className="font-medium text-text">{t.task_text}</p>
                    <p className="text-text/60 capitalize">
                      {t.status}
                      {t.due_date &&
                        ` · due ${formatPKTDate(t.due_date)} ${formatPKTTime(t.due_date)} PKT`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </ActivityBlock>

          <ActivityBlock title="Open escalations">
            {(escalations ?? []).length === 0 ? (
              <EmptyState text="No open escalations." />
            ) : (
              <ul className="space-y-2">
                {(escalations as Escalation[]).map((e) => (
                  <li
                    key={e.id}
                    className="rounded-xl bg-bg px-4 py-3 text-sm text-text"
                  >
                    {e.question_text}
                  </li>
                ))}
              </ul>
            )}
          </ActivityBlock>

          <ActivityBlock title="Documents">
            {(documents ?? []).length === 0 ? (
              <EmptyState text="No documents yet." />
            ) : (
              <ul className="space-y-2">
                {(documents as Document[]).map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-bg px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-text">
                      {d.document_name}
                    </span>
                    <span className="capitalize text-text/60">{d.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </ActivityBlock>
        </section>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {latestMeeting && (
          <Link
            href={`/dashboard/brief/${latestMeeting.id}`}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-text/20 bg-white px-4 py-2 text-sm font-medium text-text transition-colors hover:border-text/40 sm:w-auto"
          >
            View AI Brief →
          </Link>
        )}
        <Link
          href={`/chat/${clientId}`}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-blue/30 px-4 py-2 text-sm font-medium text-blue transition-colors hover:border-blue/50 sm:w-auto"
        >
          View Chat →
        </Link>
      </div>
    </main>
  )
}

function InfoRow({
  label,
  value,
  capitalize: cap,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-text/60">{label}</dt>
      <dd className={`text-right font-medium text-text ${cap ? 'capitalize' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

function ActivityBlock({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-text/10 bg-white p-5">
      <h2 className="mb-3 text-lg font-bold text-text">{title}</h2>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-text/60">{text}</p>
}
