'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Edit2, X } from 'lucide-react'
import { DEAL_SERVICE_LABELS, DEAL_SERVICE_TYPES, formatPkr } from '@/lib/admin/dealTypes'
import { cn } from '@/lib/utils'
import { TeamCommissionSection } from './TeamCommissionSection'

type CounselorOption = { id: string; name: string }
type BranchOption = { id: string; name: string }

type CounselorPolicy = {
  counselorId: string
  counselorName: string
  status: string
  baseSalary: number
  defaultCommissionRate: number
  serviceRates: Record<string, number>
}

const inputClass =
  'min-h-[44px] w-full rounded-full px-4 py-2 text-sm outline-none glass-input'

export function IncentivePolicyPanel({
  counselors,
  showBranchFilter = false,
}: {
  counselors: CounselorOption[]
  showBranchFilter?: boolean
}) {
  const [policies, setPolicies] = useState<CounselorPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [branchId, setBranchId] = useState('all')

  // Edit state
  const [editBaseSalary, setEditBaseSalary] = useState('')
  const [editDefaultRate, setEditDefaultRate] = useState('')
  const [editServiceRates, setEditServiceRates] = useState<Record<string, string>>({})

  // Branch list only needed for CEO/unscoped admins — Branch Managers are
  // already locked server-side (Idea #4, extended to Incentive Policy).
  useEffect(() => {
    if (!showBranchFilter) return
    fetch('/api/admin/branches')
      .then((r) => r.json())
      .then((d) => setBranches((d.branches ?? []).map((b: { id: string; name: string }) => ({ id: b.id, name: b.name }))))
      .catch(() => setBranches([]))
  }, [showBranchFilter])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = branchId !== 'all' ? `?branchId=${branchId}` : ''
      const res = await fetch(`/api/admin/incentive${qs}`)
      const data = await res.json()
      if (res.ok) setPolicies(data.counselors ?? [])
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    load()
  }, [load])

  function startEdit(policy: CounselorPolicy) {
    setEditing(policy.counselorId)
    setEditBaseSalary(String(policy.baseSalary))
    setEditDefaultRate(String(policy.defaultCommissionRate))
    const rates: Record<string, string> = {}
    for (const svc of DEAL_SERVICE_TYPES) {
      rates[svc] = String(policy.serviceRates[svc] ?? policy.defaultCommissionRate)
    }
    setEditServiceRates(rates)
    setError('')
  }

  function cancelEdit() {
    setEditing(null)
    setError('')
  }

  async function saveEdit(counselorId: string) {
    setSaving(true)
    setError('')
    try {
      const serviceRates: Record<string, number> = {}
      for (const svc of DEAL_SERVICE_TYPES) {
        serviceRates[svc] = Number(editServiceRates[svc] ?? editDefaultRate)
      }
      const res = await fetch('/api/admin/incentive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counselorId,
          baseSalary: Number(editBaseSalary),
          defaultCommissionRate: Number(editDefaultRate),
          serviceRates,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Save failed'); return }
      await load()
      setEditing(null)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-white/50">Loading incentive policies…</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-white/50">
          Set base salary, default commission rate, and per-service commission rates for each counselor.
          Changes take effect immediately for future commission calculations.
        </p>
        {showBranchFilter && (
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="min-h-[40px] shrink-0 rounded-full px-3 text-sm outline-none glass-input"
            aria-label="Branch"
          >
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {policies.length === 0 ? (
        <p className="text-sm text-white/50">No active counselors found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {policies.map((policy) => {
            const isExpanded = expandedId === policy.counselorId
            const isEditing = editing === policy.counselorId

            return (
              <div
                key={policy.counselorId}
                className="rounded-2xl border border-white/10 glass-card crisp-on-dark overflow-hidden"
              >
                {/* Header row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : policy.counselorId)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white/80">{policy.counselorName}</p>
                    <p className="text-xs text-white/50 mt-0.5">
                      Base: {formatPkr(policy.baseSalary)} · Default commission: {policy.defaultCommissionRate}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); startEdit(policy) }}
                      className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-white/40" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-white/40" />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && !isEditing && (
                  <div className="border-t border-white/5 px-5 py-4">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">
                      Per-Service Commission Rates
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {DEAL_SERVICE_TYPES.map((svc) => (
                        <div key={svc} className="rounded-xl glass-card p-3">
                          <p className="text-xs text-white/50">{DEAL_SERVICE_LABELS[svc]}</p>
                          <p className="text-lg font-bold text-white/80 mt-1">
                            {policy.serviceRates[svc] ?? policy.defaultCommissionRate}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit form */}
                {isEditing && (
                  <div className="border-t border-white/5 px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    {error && (
                      <p className="mb-3 rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-400">{error}</p>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-white/50 mb-1.5">
                          Base Salary (PKR/month)
                        </label>
                        <input
                          type="number"
                          value={editBaseSalary}
                          onChange={(e) => setEditBaseSalary(e.target.value)}
                          min="0"
                          className={inputClass}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/50 mb-1.5">
                          Default Commission Rate (%)
                        </label>
                        <input
                          type="number"
                          value={editDefaultRate}
                          onChange={(e) => setEditDefaultRate(e.target.value)}
                          min="0"
                          max="100"
                          step="0.5"
                          className={inputClass}
                          placeholder="10"
                        />
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">
                      Per-Service Commission Rates (%)
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
                      {DEAL_SERVICE_TYPES.map((svc) => (
                        <div key={svc}>
                          <label className="block text-xs text-white/50 mb-1.5">
                            {DEAL_SERVICE_LABELS[svc]}
                          </label>
                          <input
                            type="number"
                            value={editServiceRates[svc] ?? ''}
                            onChange={(e) =>
                              setEditServiceRates((prev) => ({ ...prev, [svc]: e.target.value }))
                            }
                            min="0"
                            max="100"
                            step="0.5"
                            className={cn(inputClass, 'rounded-xl')}
                            placeholder={editDefaultRate}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(policy.counselorId)}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-full bg-grad-blue crisp-on-dark px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/50"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <TeamCommissionSection />
    </div>
  )
}
