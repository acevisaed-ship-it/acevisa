import Link from 'next/link'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { getScoreBadgeColor } from '@/lib/brief'
import { formatPKTRegistrationDate } from '@/lib/pkt'
import type { Client } from '@/types'

const STAGES: { stage: number; label: string }[] = [
  { stage: 1, label: 'New Lead' },
  { stage: 2, label: 'Qualified' },
  { stage: 3, label: 'Registered Client' },
  { stage: 4, label: 'Documents In Progress' },
  { stage: 5, label: 'Application Submitted' },
  { stage: 6, label: 'Visa Outcome' },
  { stage: 7, label: 'Alumni' },
]

export default async function PipelinePage() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return null

  const supabase = createAdminClient()

  const [{ data: clients }, { data: meetings }] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('counselor_id', counselor.id)
      .order('registration_date', { ascending: false }),
    supabase
      .from('meetings')
      .select('id, client_id')
      .eq('counselor_id', counselor.id)
      .order('created_at', { ascending: false }),
  ])

  const meetingByClient = new Map<string, string>()
  for (const meeting of meetings ?? []) {
    if (!meetingByClient.has(meeting.client_id)) {
      meetingByClient.set(meeting.client_id, meeting.id)
    }
  }

  const clientsByStage = new Map<number, Client[]>()
  for (const stage of STAGES) {
    clientsByStage.set(stage.stage, [])
  }
  for (const client of (clients ?? []) as Client[]) {
    const stage = client.pipeline_stage ?? 1
    const list = clientsByStage.get(stage) ?? []
    list.push(client)
    clientsByStage.set(stage, list)
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <h1 className="mb-6 text-2xl font-semibold text-blue md:text-3xl">Pipeline</h1>

      <div className="-mx-6 overflow-x-auto px-6 pb-4 md:-mx-8 md:px-8">
        <div className="flex min-w-max gap-4 snap-x snap-mandatory">
          {STAGES.map(({ stage, label }) => {
            const stageClients = clientsByStage.get(stage) ?? []
            return (
              <div
                key={stage}
                className="flex w-[280px] shrink-0 snap-start flex-col sm:w-[300px]"
              >
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-bold text-text">{label}</h2>
                  <span className="rounded-full bg-green px-2 py-0.5 text-xs font-semibold text-text">
                    {stageClients.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {stageClients.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-text/10 px-4 py-6 text-center text-sm text-text/40">
                      No clients
                    </p>
                  ) : (
                    stageClients.map((client) => {
                      const meetingId = meetingByClient.get(client.id)
                      const showBrief =
                        client.pipeline_stage >= 2 && meetingId !== undefined
                      const score = client.qualification_score
                      const scoreColor =
                        score !== null && score > 0
                          ? getScoreBadgeColor(score)
                          : null

                      return (
                        <div
                          key={client.id}
                          className="rounded-2xl border border-text/[0.12] bg-white p-4"
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <p className="font-bold text-text">{client.name}</p>
                            {scoreColor !== null && score !== null && (
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                style={{ backgroundColor: scoreColor }}
                              >
                                {score}
                              </span>
                            )}
                          </div>

                          <p className="mb-2 text-xs text-text/60">
                            {[client.city, client.language]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>

                          {client.ad_source && (
                            <span className="mb-3 inline-block rounded-full bg-orange px-2 py-0.5 text-xs font-medium text-text">
                              {client.ad_source}
                            </span>
                          )}

                          <div className="mt-2 flex flex-wrap gap-2">
                            {showBrief && (
                              <Link
                                href={`/dashboard/brief/${meetingId}`}
                                className="inline-flex items-center rounded-full border border-text/20 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-text/40"
                              >
                                View Brief →
                              </Link>
                            )}
                            <Link
                              href={`/dashboard/clients/${client.id}`}
                              className="inline-flex items-center rounded-full border border-blue/30 px-3 py-1.5 text-xs font-medium text-blue transition-colors hover:border-blue/50"
                            >
                              View Client →
                            </Link>
                          </div>

                          {client.registration_date && (
                            <p className="mt-3 text-xs text-text/40">
                              Registered{' '}
                              {formatPKTRegistrationDate(client.registration_date)}
                            </p>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
