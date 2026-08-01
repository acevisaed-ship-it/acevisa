'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { getScoreBadgeColor, getPipelineStageLabel } from '@/lib/brief'
import { formatPKTRegistrationDate } from '@/lib/pkt'

export type CounselorClientRow = {
  id: string
  name: string
  client_code: string | null
  email: string | null
  phone: string
  city: string | null
  pipeline_stage: number
  qualification_score: number | null
  registration_date: string
  status?: 'active' | 'suspended'
}

type Props = {
  clients: CounselorClientRow[]
  basePath?: string
}

export function CounselorClientsList({ clients, basePath = '/dashboard' }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.client_code && c.client_code.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    )
  }, [search, clients])

  return (
    <div>
      {/* Search */}
      <div className="mb-5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, email or phone…"
          className="min-h-[44px] w-full max-w-sm rounded-full px-4 py-2.5 text-sm outline-none glass-input"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 glass-card crisp-on-dark">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Registered</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-white/40">
                  {search ? 'No clients match your search.' : 'No clients yet.'}
                </td>
              </tr>
            ) : (
              filtered.map((client) => {
                const score = client.qualification_score
                const scoreColor = score !== null && score > 0 ? getScoreBadgeColor(score) : null
                return (
                  <tr key={client.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white/80">{client.name}</p>
                        {client.status === 'suspended' && (
                          <span className="inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">
                            Suspended
                          </span>
                        )}
                      </div>
                      {client.client_code && (
                        <p className="font-mono text-xs font-semibold text-orange/80">{client.client_code}</p>
                      )}
                      {client.email && (
                        <p className="text-xs text-white/40">{client.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60">{client.phone}</td>
                    <td className="px-4 py-3 text-white/60">{client.city || '—'}</td>
                    <td className="px-4 py-3 text-white/60">
                      {getPipelineStageLabel(client.pipeline_stage)}
                    </td>
                    <td className="px-4 py-3">
                      {scoreColor !== null && score !== null ? (
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: scoreColor }}
                        >
                          {score}
                        </span>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {formatPKTRegistrationDate(client.registration_date)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`${basePath}/clients/${client.id}`}
                        className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:text-white"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
