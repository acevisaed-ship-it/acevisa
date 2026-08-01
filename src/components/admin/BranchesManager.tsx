'use client'

import { useEffect, useState } from 'react'

type Branch = {
  id: string
  name: string
  code: string | null
  address: string | null
  phone: string | null
  is_active: boolean
  staffCount: number
  clientCount: number
}

const inputCls = 'min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input'

export function BranchesManager() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/admin/branches')
      .then((r) => r.json())
      .then((d) => setBranches(d.branches || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCreating(true)

    const res = await fetch('/api/admin/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setCreating(false)

    if (!res.ok) {
      setError(data.error || 'Failed to create branch')
      return
    }

    setForm({ name: '', code: '', address: '', phone: '' })
    load()
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-white">All Branches</h2>
        {loading ? (
          <p className="mt-4 text-sm text-white/40">Loading…</p>
        ) : branches.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">No branches yet — create the first one below.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {branches.map((b) => (
              <article key={b.id} className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
                <h3 className="text-lg font-bold text-white">{b.name}</h3>
                {b.code && <p className="mt-0.5 font-mono text-xs text-white/40">{b.code}</p>}
                {b.address && <p className="mt-2 text-sm text-white/60">{b.address}</p>}
                {b.phone && <p className="text-sm text-white/60">{b.phone}</p>}
                <p className="mt-4 text-sm font-medium text-white/70">
                  {b.staffCount} staff <span className="mx-2 text-white/20">|</span> {b.clientCount} clients
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold text-white">Add New Branch</h2>
        <form onSubmit={handleCreate} className="mt-4 max-w-xl space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">Branch name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
              placeholder="Lahore Main"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Short code (optional)</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className={inputCls}
                placeholder="LHR"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Phone (optional)</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">Address (optional)</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={inputCls}
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/20 px-4 py-2.5 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={creating}
            className="min-h-[44px] w-full rounded-full bg-grad-blue crisp-on-dark px-6 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {creating ? 'Creating…' : 'Create branch'}
          </button>
        </form>
      </div>
    </div>
  )
}
