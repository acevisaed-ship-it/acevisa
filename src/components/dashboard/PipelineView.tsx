'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { getScoreBadgeColor } from '@/lib/brief'
import { formatPKTRegistrationDate } from '@/lib/pkt'
import type { Client } from '@/types'

type Stage = {
  stage: number
  label: string
}

type Props = {
  stages: Stage[]
  clientsByStage: Record<number, Client[]>
  meetingByClient: Record<string, string>
}

export function PipelineView({ stages, clientsByStage, meetingByClient }: Props) {
  const defaultStage = useMemo(() => {
    let maxStage = stages[0]?.stage ?? 1
    let maxCount = 0
    for (const { stage } of stages) {
      const count = clientsByStage[stage]?.length ?? 0
      if (count > maxCount) {
        maxCount = count
        maxStage = stage
      }
    }
    return maxStage
  }, [stages, clientsByStage])

  const [activeStage, setActiveStage] = useState(defaultStage)

  const stageClients = clientsByStage[activeStage] ?? []

  function renderClientCard(client: Client) {
    const meetingId = meetingByClient[client.id]
    const showBrief = client.pipeline_stage >= 2 && meetingId !== undefined
    const score = client.qualification_score
    const scoreColor =
      score !== null && score > 0 ? getScoreBadgeColor(score) : null

    return (
      <div
        key={client.id}
        className="w-full rounded-2xl border border-text/[0.12] bg-white p-4"
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
          {[client.city, client.language].filter(Boolean).join(' · ')}
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
              className="inline-flex min-h-[44px] items-center rounded-full border border-text/20 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-text/40"
            >
              View Brief →
            </Link>
          )}
          <Link
            href={`/dashboard/clients/${client.id}`}
            className="inline-flex min-h-[44px] items-center rounded-full border border-blue/30 px-3 py-1.5 text-xs font-medium text-blue transition-colors hover:border-blue/50"
          >
            View Client →
          </Link>
        </div>

        {client.registration_date && (
          <p className="mt-3 text-xs text-text/40">
            Registered {formatPKTRegistrationDate(client.registration_date)}
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Mobile: stage tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2 lg:hidden">
        {stages.map(({ stage, label }) => {
          const count = clientsByStage[stage]?.length ?? 0
          const isActive = activeStage === stage
          return (
            <button
              key={stage}
              type="button"
              onClick={() => setActiveStage(stage)}
              className={`shrink-0 rounded-full px-3 py-2 text-sm font-bold transition-colors ${
                isActive
                  ? 'bg-green text-text'
                  : 'bg-bg text-text'
              }`}
            >
              {label} ({count})
            </button>
          )
        })}
      </div>

      {/* Mobile: vertical client list */}
      <div className="flex flex-col gap-3 lg:hidden">
        {stageClients.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-text/10 px-4 py-6 text-center text-sm text-text/40">
            No clients in this stage
          </p>
        ) : (
          stageClients.map(renderClientCard)
        )}
      </div>

      {/* Desktop: horizontal Kanban */}
      <div className="-mx-6 hidden overflow-x-auto px-6 pb-4 md:-mx-8 md:px-8 lg:block">
        <div className="flex min-w-max gap-4 snap-x snap-mandatory">
          {stages.map(({ stage, label }) => {
            const clients = clientsByStage[stage] ?? []
            return (
              <div
                key={stage}
                className="flex w-[280px] shrink-0 snap-start flex-col sm:w-[300px]"
              >
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-bold text-text">{label}</h2>
                  <span className="rounded-full bg-green px-2 py-0.5 text-xs font-semibold text-text">
                    {clients.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {clients.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-text/10 px-4 py-6 text-center text-sm text-text/40">
                      No clients
                    </p>
                  ) : (
                    clients.map(renderClientCard)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
