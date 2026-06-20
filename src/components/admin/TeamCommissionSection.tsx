'use client'

import { useEffect, useState } from 'react'
import { Check, X, Users, GitMerge, Info } from 'lucide-react'

type Policy = {
  referral_enabled: boolean
  referral_rate: number
  pool_enabled: boolean
  pool_rate: number
  pool_distribution: 'equal' | 'performance'
  notes: string | null
}

const DEFAULT: Policy = {
  referral_enabled: false,
  referral_rate: 5,
  pool_enabled: false,
  pool_rate: 5,
  pool_distribution: 'equal',
  notes: null,
}

const inputClass =
  'min-h-[44px] w-full rounded-full px-4 py-2 text-sm outline-none glass-input'

export function TeamCommissionSection() {
  const [policy, setPolicy] = useState<Policy>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // edit draft
  const [draft, setDraft] = useState<Policy>(DEFAULT)

  useEffect(() => {
    fetch('/api/admin/team-commission')
      .then((r) => r.json())
      .then(({ policy: p }) => {
        if (p) setPolicy(p)
      })
      .finally(() => setLoading(false))
  }, [])

  function startEdit() {
    setDraft({ ...policy })
    setEditing(true)
    setError('')
    setSaved(false)
  }

  function cancelEdit() {
    setEditing(false)
    setError('')
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/team-commission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Save failed'); return }
      setPolicy({ ...draft })
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="mt-6 rounded-2xl border border-white/10 glass-card crisp-on-dark overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B7C733]/15">
            <Users className="h-4 w-4 text-[#B7C733]" />
          </div>
          <div>
            <p className="font-semibold text-white/80">Team Commissions</p>
            <p className="text-xs text-white/40 mt-0.5">
              Referral splits and shared team pool settings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && !editing && (
            <span className="text-xs text-green-400">Saved ✓</span>
          )}
          {!editing ? (
            <button
              type="button"
              onClick={startEdit}
              className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-full bg-grad-blue crisp-on-dark px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/50"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="mx-5 mt-4 rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="px-5 py-5 grid gap-6 md:grid-cols-2">

        {/* ── Referral Commission ─────────────────────────────── */}
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-white/40" />
              <p className="text-sm font-semibold text-white/70">Referral Commission</p>
            </div>
            {editing ? (
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, referral_enabled: !d.referral_enabled }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  draft.referral_enabled ? 'bg-[#B7C733]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    draft.referral_enabled ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            ) : (
              <span className={`text-xs font-medium ${policy.referral_enabled ? 'text-[#B7C733]' : 'text-white/30'}`}>
                {policy.referral_enabled ? 'ON' : 'OFF'}
              </span>
            )}
          </div>

          <p className="text-xs text-white/40 mb-4 leading-relaxed">
            When counselor A refers a lead that counselor B closes, counselor A earns this % of the deal commission.
          </p>

          {editing ? (
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Referral rate (%)</label>
              <input
                type="number"
                value={draft.referral_rate}
                onChange={(e) => setDraft((d) => ({ ...d, referral_rate: Number(e.target.value) }))}
                min="0"
                max="100"
                step="0.5"
                disabled={!draft.referral_enabled}
                className={`${inputClass} disabled:opacity-40`}
                placeholder="5"
              />
            </div>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-white/80">{policy.referral_rate}%</span>
              <span className="text-xs text-white/40">of deal commission</span>
            </div>
          )}
        </div>

        {/* ── Team Pool ───────────────────────────────────────── */}
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-white/40" />
              <p className="text-sm font-semibold text-white/70">Team Pool</p>
            </div>
            {editing ? (
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, pool_enabled: !d.pool_enabled }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  draft.pool_enabled ? 'bg-[#B7C733]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    draft.pool_enabled ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            ) : (
              <span className={`text-xs font-medium ${policy.pool_enabled ? 'text-[#B7C733]' : 'text-white/30'}`}>
                {policy.pool_enabled ? 'ON' : 'OFF'}
              </span>
            )}
          </div>

          <p className="text-xs text-white/40 mb-4 leading-relaxed">
            A % of every closed deal commission goes into a shared pool, distributed to the team at month-end.
          </p>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Pool rate (% of each deal)</label>
                <input
                  type="number"
                  value={draft.pool_rate}
                  onChange={(e) => setDraft((d) => ({ ...d, pool_rate: Number(e.target.value) }))}
                  min="0"
                  max="100"
                  step="0.5"
                  disabled={!draft.pool_enabled}
                  className={`${inputClass} disabled:opacity-40`}
                  placeholder="5"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Distribution method</label>
                <div className="flex gap-2">
                  {(['equal', 'performance'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      disabled={!draft.pool_enabled}
                      onClick={() => setDraft((d) => ({ ...d, pool_distribution: method }))}
                      className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                        draft.pool_distribution === method
                          ? 'bg-[#B7C733]/25 text-[#B7C733]'
                          : 'border border-white/15 text-white/50 hover:text-white/80'
                      }`}
                    >
                      {method === 'equal' ? 'Equal split' : 'By performance'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-white/80">{policy.pool_rate}%</span>
                <span className="text-xs text-white/40">of each deal</span>
              </div>
              <p className="text-xs text-white/50">
                Distribution:{' '}
                <span className="text-white/70 font-medium">
                  {policy.pool_distribution === 'equal' ? 'Equal split among team' : 'Weighted by individual performance'}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {editing && (
        <div className="px-5 pb-5">
          <label className="block text-xs text-white/50 mb-1.5">Internal notes (optional)</label>
          <textarea
            value={draft.notes ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            rows={2}
            placeholder="Any notes about team commission policy…"
            className="w-full rounded-xl px-4 py-3 text-sm outline-none glass-input resize-none"
          />
        </div>
      )}

      {!editing && policy.notes && (
        <div className="mx-5 mb-5 flex gap-2 rounded-xl bg-white/5 px-4 py-3">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-white/30" />
          <p className="text-xs text-white/50">{policy.notes}</p>
        </div>
      )}
    </div>
  )
}
