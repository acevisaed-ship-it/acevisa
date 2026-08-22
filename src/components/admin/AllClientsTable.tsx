'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { TransferModal } from '@/components/admin/TransferModal'
import { RemoveClientModal } from '@/components/admin/RemoveClientModal'
import { getPipelineStageLabel } from '@/lib/brief'
import { cn } from '@/lib/utils'

type CounselorOption = { id: string; name: string }

export type AdminClientRow = {
  id: string
  name: string
  client_code?: string | null
  email?: string | null
  phone?: string | null
  counselor_id: string | null
  counselor_name: string | null
  ad_source: string | null
  pipeline_stage: number
  qualification_score: number | null
  created_at: string
  status?: 'active' | 'suspended'
}

type Props = {
  clients: AdminClientRow[]
  counselors: CounselorOption[]
}

type FilterMode = 'all' | 'unassigned' | 'counselor' | 'stage'

export function AllClientsTable({ clients, counselors }: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [counselorFilter, setCounselorFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('1')
  const [search, setSearch] = useState('')
  const [transferClient, setTransferClient] = useState<AdminClientRow | null>(null)
  const [removeClient, setRemoveClient] = useState<AdminClientRow | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [rows, setRows] = useState(clients)

  const filtered = useMemo(() => {
    let result = rows

    // Filter mode
    switch (filterMode) {
      case 'unassigned':
        result = result.filter((c) => !c.counselor_id)
        break
      case 'counselor':
        if (counselorFilter) result = result.filter((c) => c.counselor_id === counselorFilter)
        break
      case 'stage':
        result = result.filter((c) => c.pipeline_stage === Number(stageFilter))
        break
    }

    // Search
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.client_code && c.client_code.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q))
      )
    }

    return result
  }, [filterMode, counselorFilter, stageFilter, search, rows])

  function handleTransferSuccess(clientId: string, counselorName: string) {
    const counselor = counselors.find((c) => c.name === counselorName)
    setRows((current) =>
      current.map((c) =>
        c.id === clientId
          ? {
              ...c,
              counselor_id: counselor?.id ?? c.counselor_id,
              counselor_name: counselorName,
            }
          : c
      )
    )
    setTransferClient(null)
    setToast(`Client transferred to ${counselorName}`)
    setTimeout(() => setToast(null), 4000)
  }

  function handleRemoveSuccess(clientId: string, clientName: string) {
    setRows((current) => current.filter((c) => c.id !== clientId))
    setRemoveClient(null)
    setToast(`${clientName} removed`)
    setTimeout(() => setToast(null), 4000)
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-grad-blue crisp-on-dark px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['unassigned', 'Unassigned'],
            ['counselor', 'By Counselor'],
            ['stage', 'By Stage'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilterMode(value)}
            className={cn(
              'min-h-[40px] rounded-full px-4 text-sm font-medium transition-colors',
              filterMode === value
                ? 'bg-green text-[#0A3F3A]'
                : 'border border-white/15 glass-card text-white/60 hover:text-white'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, email or phone…"
          className="min-h-[44px] w-full max-w-sm rounded-full px-4 py-2.5 text-sm outline-none glass-input"
        />
      </div>

      {filterMode === 'counselor' && (
        <div className="mb-4">
          <select
            value={counselorFilter}
            onChange={(e) => setCounselorFilter(e.target.value)}
            className="min-h-[44px] rounded-full px-4 text-sm outline-none glass-input"
          >
            <option value="">All counselors</option>
            {counselors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {filterMode === 'stage' && (
        <div className="mb-4">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="min-h-[44px] rounded-full px-4 text-sm outline-none glass-input"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((stage) => (
              <option key={stage} value={stage}>
                Stage {stage} — {getPipelineStageLabel(stage)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10 glass-card crisp-on-dark">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Counselor</th>
              <th className="px-4 py-3 font-medium">Ad Source</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Registered</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-white/40">
                  No clients match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((client) => (
                <tr key={client.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white/80">{client.name}</span>
                      {client.status === 'suspended' && (
                        <span className="inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">
                          Suspended
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-white/40">
                      {client.client_code && (
                        <span className="font-mono font-semibold text-orange/80">{client.client_code}</span>
                      )}
                      {client.email && <span>{client.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {client.counselor_name ? (
                      client.counselor_name
                    ) : (
                      <span className="font-medium text-red-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/60">{client.ad_source || 'direct'}</td>
                  <td className="px-4 py-3 text-white/60">
                    {getPipelineStageLabel(client.pipeline_stage)}
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {client.qualification_score ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-white/50">{formatDate(client.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setTransferClient(client)}
                        className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/60 hover:text-white"
                      >
                        Transfer
                      </button>
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="rounded-full bg-blue/20 px-3 py-1 text-xs font-medium text-white hover:bg-blue/30"
                      >
                        View Profile
                      </Link>
                      <button
                        type="button"
                        onClick={() => setRemoveClient(client)}
                        className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {transferClient && (
        <TransferModal
          clientId={transferClient.id}
          clientName={transferClient.name}
          currentCounselorId={transferClient.counselor_id}
          currentCounselorName={transferClient.counselor_name}
          counselors={counselors}
          onClose={() => setTransferClient(null)}
          onSuccess={(counselorName) =>
            handleTransferSuccess(transferClient.id, counselorName)
          }
        />
      )}

      {removeClient && (
        <RemoveClientModal
          clientId={removeClient.id}
          clientName={removeClient.name}
          onClose={() => setRemoveClient(null)}
          onSuccess={() => handleRemoveSuccess(removeClient.id, removeClient.name)}
        />
      )}
    </>
  )
}
