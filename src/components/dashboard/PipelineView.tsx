'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { getScoreBadgeColor } from '@/lib/brief'
import { formatPKTRegistrationDate } from '@/lib/pkt'
import { TransferModal } from '@/components/admin/TransferModal'
import { RemoveClientModal } from '@/components/admin/RemoveClientModal'
import type { Client } from '@/types'

type Stage = {
  stage: number
  label: string
}

type CounselorOption = { id: string; name: string }

type Props = {
  stages: Stage[]
  clientsByStage: Record<number, Client[]>
  meetingByClient: Record<string, string>
  basePath?: string
  allowTransfer?: boolean
  viewingCounselorId?: string
  counselors?: CounselorOption[]
}

export function PipelineView({
  stages,
  clientsByStage,
  meetingByClient,
  basePath = '/dashboard',
  allowTransfer = false,
  viewingCounselorId,
  counselors = [],
}: Props) {
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
  const [transferClient, setTransferClient] = useState<Client | null>(null)
  const [removeClient, setRemoveClient] = useState<Client | null>(null)
  const [search, setSearch] = useState('')

  const clientBasePath = allowTransfer ? '/admin/clients' : `${basePath}/clients`

  // Filter clients by search query across name, email, phone
  const filterClients = (clients: Client[]) => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    )
  }

  const filteredByStage = useMemo(() => {
    const result: Record<number, Client[]> = {}
    for (const { stage } of stages) {
      result[stage] = filterClients(clientsByStage[stage] ?? [])
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, clientsByStage, stages])

  const stageClients = filteredByStage[activeStage] ?? []

  function renderClientCard(client: Client) {
    const meetingId = meetingByClient[client.id]
    const isQualifiedOrBeyond = client.pipeline_stage >= 2
    const hasMeeting = meetingId !== undefined
    const score = client.qualification_score
    const scoreColor =
      score !== null && score > 0 ? getScoreBadgeColor(score) : null

    return (
      <div
        key={client.id}
        className="w-full rounded-2xl border border-white/10 glass-card crisp-on-dark p-4"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="font-bold text-white">{client.name}</p>
          {scoreColor !== null && score !== null && (
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: scoreColor }}
            >
              {score}
            </span>
          )}
        </div>

        <p className="mb-2 text-xs text-white/50">
          {[client.city, client.language].filter(Boolean).join(' · ')}
        </p>

        {client.ad_source && (
          <span className="mb-3 inline-block rounded-full bg-orange px-2 py-0.5 text-xs font-medium text-text">
            {client.ad_source}
          </span>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Link
            href={`${clientBasePath}/${client.id}`}
            className="inline-flex min-h-[44px] items-center rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:text-white"
          >
            View Client →
          </Link>
          {allowTransfer && (
            <button
              type="button"
              onClick={() => setTransferClient(client)}
              className="inline-flex min-h-[44px] items-center rounded-full border border-orange/40 px-3 py-1.5 text-xs font-medium text-orange transition-colors hover:border-orange/70"
            >
              Transfer →
            </button>
          )}
          {allowTransfer && (
            <button
              type="button"
              onClick={() => setRemoveClient(client)}
              className="inline-flex min-h-[44px] items-center rounded-full border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:border-red-500/70"
            >
              Remove
            </button>
          )}
        </div>

        {client.registration_date && (
          <p className="mt-3 text-xs text-white/30">
            Registered {formatPKTRegistrationDate(client.registration_date)}
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Search bar */}
      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="min-h-[44px] w-full max-w-sm rounded-full px-4 py-2.5 text-sm outline-none glass-input"
        />
      </div>

      {/* Mobile: stage tabs */}
      <div className="scrollbar-hidden mb-4 flex gap-2 overflow-x-auto pb-2 lg:hidden">
        {stages.map(({ stage, label }) => {
          const count = filteredByStage[stage]?.length ?? 0
          const isActive = activeStage === stage
          return (
            <button
              key={stage}
              type="button"
              onClick={() => setActiveStage(stage)}
              className={`shrink-0 rounded-full px-3 py-2 text-sm font-bold transition-colors ${
                isActive ? 'tab-btn-active' : 'tab-btn-inactive'
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
          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/30">
            No clients in this stage
          </p>
        ) : (
          stageClients.map(renderClientCard)
        )}
      </div>

      {/* Desktop: horizontal Kanban */}
      <div className="hidden overflow-x-auto pb-4 lg:block">
        <div className="flex w-max gap-4">
          {stages.map(({ stage, label }) => {
            const clients = filteredByStage[stage] ?? []
            return (
              <div
                key={stage}
                className="flex w-[280px] shrink-0 flex-col sm:w-[300px]"
              >
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white">{label}</h2>
                  <span className="rounded-full bg-green px-2 py-0.5 text-xs font-semibold text-[#0A3F3A]">
                    {clients.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {clients.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/30">
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

      {transferClient && (
        <TransferModal
          clientId={transferClient.id}
          clientName={transferClient.name}
          currentCounselorId={viewingCounselorId ?? null}
          currentCounselorName={null}
          counselors={counselors}
          onClose={() => setTransferClient(null)}
          onSuccess={() => {
            setTransferClient(null)
            window.location.reload()
          }}
        />
      )}

      {removeClient && (
        <RemoveClientModal
          clientId={removeClient.id}
          clientName={removeClient.name}
          onClose={() => setRemoveClient(null)}
          onSuccess={() => {
            setRemoveClient(null)
            window.location.reload()
          }}
        />
      )}
    </>
  )
}
