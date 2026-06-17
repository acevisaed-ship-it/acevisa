'use client'

import { useState } from 'react'
import { formatRegistrationAge } from '@/lib/admin/formatRegistrationAge'
import { cn } from '@/lib/utils'

type CounselorOption = { id: string; name: string }

export type UnassignedClient = {
  id: string
  name: string
  phone: string
  city: string | null
  language: string
  ad_source: string | null
  created_at: string
  campaignName?: string | null
}

type Props = {
  initialClients: UnassignedClient[]
  counselors: CounselorOption[]
}

export function UnassignedClientsList({ initialClients, counselors }: Props) {
  const [clients, setClients] = useState(initialClients)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAssign(clientId: string) {
    const counselorId = selections[clientId]
    if (!counselorId) {
      setError('Please select a counselor before assigning.')
      return
    }

    setError(null)
    setLoadingId(clientId)

    const previous = clients

    setClients((current) => current.filter((c) => c.id !== clientId))

    try {
      const res = await fetch(`/api/admin/clients/${clientId}/assign`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counselorId }),
      })

      if (!res.ok) {
        const data = await res.json()
        setClients(previous)
        setError(data.error || 'Assignment failed')
      }
    } catch {
      setClients(previous)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoadingId(null)
    }
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 glass-card px-6 py-12 text-center">
        <p className="text-lg font-medium text-white">All caught up!</p>
        <p className="mt-1 text-sm text-white/50">No unassigned clients right now.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-orange/10 px-4 py-3 text-sm text-orange">{error}</p>
      )}

      {clients.map((client) => {
        const { label, isStale } = formatRegistrationAge(client.created_at)
        const adLabel = client.campaignName || client.ad_source || 'Direct'

        return (
          <article
            key={client.id}
            className="flex flex-col gap-4 rounded-2xl border border-white/10 glass-card crisp-on-dark p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="truncate text-lg font-bold text-white">{client.name}</h2>
              <p className="text-sm text-white/60">{client.phone}</p>

              <div className="flex flex-wrap gap-2">
                {client.city && (
                  <span className="rounded-full glass-card-md px-2.5 py-0.5 text-xs text-white/70">
                    {client.city}
                  </span>
                )}
                <span className="rounded-full glass-card-md px-2.5 py-0.5 text-xs capitalize text-white/70">
                  {client.language}
                </span>
                <span className="rounded-full bg-orange px-2.5 py-0.5 text-xs font-medium text-white">
                  {adLabel}
                </span>
              </div>

              <p className={cn('text-xs', isStale ? 'font-medium text-red-400' : 'text-white/40')}>
                {label}
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:w-[220px]">
              <select
                value={selections[client.id] ?? ''}
                onChange={(e) =>
                  setSelections((prev) => ({ ...prev, [client.id]: e.target.value }))
                }
                className="min-h-[44px] w-full rounded-full px-4 text-sm outline-none glass-input"
              >
                <option value="">Assign to...</option>
                {counselors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={loadingId === client.id}
                onClick={() => handleAssign(client.id)}
                className="min-h-[44px] rounded-full bg-green px-4 text-sm font-bold text-text transition-opacity disabled:opacity-50"
              >
                {loadingId === client.id ? 'Assigning...' : 'Assign →'}
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
