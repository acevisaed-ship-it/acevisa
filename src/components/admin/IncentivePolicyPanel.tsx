'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Edit2, X } from 'lucide-react'
import { DEAL_SERVICE_LABELS, DEAL_SERVICE_TYPES, formatPkr } from '@/lib/admin/dealTypes'
import { cn } from '@/lib/utils'

type CounselorOption = { id: string; name: string }

type CounselorPolicy = {
  counselorId: string
  counselorName: string
  status: string
  baseSalary: number
  defaultCommissionRate: number
  serviceRates: Record<string, number>
}

const inputClass =
  'min-h-[44px] w-full rounded-full border border-text/20 bg-bg px-4 py-2 text-sm text-text outline-none focus:border-blue'

export function IncentivePolicyPanel({ counselors }: { counselors: CounselorOption[] }) {
  const [policies, setPolicies] = useState<CounselorPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Edit state
  const [editBaseSalary, setEditBaseSalary] = useState('')
  const [editDefaultRate, setEditDefaultRate] = useState('')
  const [editServiceRates, setEditServiceRates] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/incentive')
      const data = await res.json()
      if (res.ok) setPolicies(data.counselors ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

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

  if (loading) return <p className="text-sm text-text/60">Loading incentive policies…</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-text/60">
          Set base salary, default commission rate, and per-service commission rates for each counselor.
          Changes take effect immediately for future commission calculations.
        </p>
      </div>

      {policies.length === 0 ? (
        <p className="text-sm text-text/60">No active counselors found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {policies.map((policy) => {
            const isExpanded = expandedId === policy.counselorId
            const isEditing = editing === policy.counselorId

            return (
              <div
                key={policy.counselorId}
                className="rounded-2xl border border-text/10 bg-white overflow-hidden"
              >
                {/* Header row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : policy.counselorId)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text">{policy.counselorName}</p>
                    <p className="text-xs text-text/50 mt-0.5">
                      Base: {formatPkr(policy.baseSalary)} · Default commission: {policy.defaultCommissionRate}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); startEdit(policy) }}
                      className="flex items-center gap-1.5 rounded-full border border-blue px-3 py-1.5 text-xs font-semibold text-blue hover:bg-blue/5"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-text/40" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-text/40" />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && !isEditing && (
                  <div className="border-t border-text/5 px-5 py-4">
                    <p className="text-xs font-semibold text-text/40 uppercase tracking-wide mb-3">
                      Per-Service Commission Rates
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {DEAL_SERVICE_TYPES.map((svc) => (
                        <div key={svc} className="rounded-xl bg-bg p-3">
                          <p className="text-xs text-text/50">{DEAL_SERVICE_LABELS[svc]}</p>
                          <p className="text-lg font-bold text-text mt-1">
                            {policy.serviceRates[svc] ?? policy.defaultCommissionRate}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit form */}
                {isEditing && (
                  <div className="border-t border-text/5 px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    {error && (
                      <p className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-text/60 mb-1.5">
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
                        <label className="block text-xs font-medium text-text/60 mb-1.5">
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

                    <p className="text-xs font-semibold text-text/40 uppercase tracking-wide mb-3">
                      Per-Service Commission Rates (%)
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
                      {DEAL_SERVICE_TYPES.map((svc) => (
                        <div key={svc}>
                          <label className="block text-xs text-text/60 mb-1.5">
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
                        className="flex items-center gap-1.5 rounded-full bg-text px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex items-center gap-1.5 rounded-full border border-text/20 px-4 py-2 text-sm font-medium text-text/60"
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
    </div>
  )
}
