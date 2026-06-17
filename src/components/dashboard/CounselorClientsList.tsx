'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { getScoreBadgeColor, getPipelineStageLabel } from '@/lib/brief'
import { formatPKTRegistrationDate } from '@/lib/pkt'

export type CounselorClientRow = {
  id: string
  name: string
  email: string | null
  phone: string
  city: string | null
  pipeline_stage: number
  qualification_score: number | null
  registration_date: string
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
          placeholder="Search by name, email or phone…"
          className="min-h-[44px] w-full max-w-sm rounded-full border border-text/20 bg-white/80 px-4 py-2.5 text-sm text-text placeholder:text-text/40 outline-none focus:border-blue"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[rgba(10,63,58,0.12)] bg-white/80">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-text/10 text-xs uppercase tracking-wide text-text/50">
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
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-text/40">
                  {search ? 'No clients match your search.' : 'No clients yet.'}
                </td>
              </tr>
            ) : (
              filtered.map((client) => {
                const score = client.qualification_score
                const scoreColor = score !== null && score > 0 ? getScoreBadgeColor(score) : null
                return (
                  <tr key={client.id} className="border-b border-text/5 last:border-0 hover:bg-bg/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-text">{client.name}</p>
                      {client.email && (
                        <p className="text-xs text-text/50">{client.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text/70">{client.phone}</td>
                    <td className="px-4 py-3 text-text/70">{client.city || '—'}</td>
                    <td className="px-4 py-3 text-text/70">
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
                        <span className="text-text/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-text/50">
                      {formatPKTRegistrationDate(client.registration_date)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`${basePath}/clients/${client.id}`}
                        className="rounded-full border border-blue/30 px-3 py-1.5 text-xs font-medium text-blue transition-colors hover:border-blue/50"
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
