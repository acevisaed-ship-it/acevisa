'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Trash2, UserX } from 'lucide-react'

interface Counselor {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  created_at: string
}

const inputCls = 'min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input'

export function CounselorAccountsPanel() {
  const [counselors, setCounselors] = useState<Counselor[]>([])
  const [loadingList, setLoadingList] = useState(true)

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', password: '', confirm: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  const [actionId, setActionId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function loadCounselors() {
    setLoadingList(true)
    fetch('/api/admin/counselors/list')
      .then((r) => r.json())
      .then((d) => setCounselors(d.counselors || []))
      .finally(() => setLoadingList(false))
  }

  useEffect(() => { loadCounselors() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)

    if (!form.email.toLowerCase().endsWith('@acevisa.co')) {
      setCreateError('Email must end with @acevisa.co')
      return
    }
    if (form.password !== form.confirm) {
      setCreateError('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      setCreateError('Password must be at least 8 characters')
      return
    }

    setCreating(true)
    const res = await fetch('/api/admin/counselors/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email,
        password: form.password,
      }),
    })
    const data = await res.json()
    setCreating(false)

    if (!res.ok) {
      setCreateError(data.error || 'Failed to create counselor')
      return
    }

    setCreateSuccess(`${form.firstName} ${form.lastName} has been added. They can now log in at /login.`)
    setForm({ firstName: '', lastName: '', phone: '', email: '', password: '', confirm: '' })
    loadCounselors()
  }

  async function handleDeactivate(id: string) {
    setActionId(id)
    await fetch(`/api/admin/counselors/${id}/deactivate`, { method: 'PATCH' })
    setActionId(null)
    loadCounselors()
  }

  async function handleDelete(id: string) {
    setActionId(id)
    const res = await fetch(`/api/admin/counselors/${id}/deactivate`, { method: 'DELETE' })
    const data = await res.json()
    setActionId(null)
    setConfirmDelete(null)
    if (!res.ok) {
      alert(data.error || 'Could not delete')
      return
    }
    loadCounselors()
  }

  return (
    <div className="space-y-8">
      {/* Existing counselors */}
      <div>
        <h2 className="text-base font-semibold text-white">Counselor Accounts</h2>
        <p className="mt-1 text-sm text-white/50">All portal users with counselor or admin access.</p>

        {loadingList ? (
          <p className="mt-4 text-sm text-white/40">Loading…</p>
        ) : counselors.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">No counselors yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {counselors.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 glass-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white/80">{c.name}</p>
                  <p className="text-xs text-white/50">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  c.status === 'active' ? 'bg-green/20 text-white' : 'glass-card text-white/40'
                }`}>
                  {c.status.toUpperCase()}
                </span>

                {c.status === 'active' && (
                  <button
                    onClick={() => handleDeactivate(c.id)}
                    disabled={actionId === c.id}
                    title="Deactivate (blocks login)"
                    className="flex items-center gap-1.5 rounded-full border border-orange/30 px-3 py-1.5 text-xs font-semibold text-orange hover:bg-orange/10 disabled:opacity-40"
                  >
                    <UserX className="h-3.5 w-3.5" />
                    {actionId === c.id ? '…' : 'Deactivate'}
                  </button>
                )}

                {confirmDelete === c.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-500">Sure?</span>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={actionId === c.id}
                      className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-40"
                    >
                      {actionId === c.id ? '…' : 'Yes, delete'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/60 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(c.id)}
                    title="Permanently delete (only if no clients)"
                    className="flex items-center gap-1.5 rounded-full border border-red-400/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add new counselor */}
      <div>
        <h2 className="text-base font-semibold text-white">Add New Counselor</h2>
        <p className="mt-1 text-sm text-white/50">
          Email must end with <span className="font-mono font-semibold">@acevisa.co</span>.
          The counselor will receive login details.
        </p>

        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">First name</label>
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className={inputCls}
                placeholder="Sara"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Last name</label>
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className={inputCls}
                placeholder="Khan"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">Phone number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="03XX XXXXXXX"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">
              Email address <span className="text-orange">(@acevisa.co only)</span>
            </label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="sara.khan@acevisa.co"
              className={inputCls}
            />
          </div>

          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-white/60">Password</label>
            <input
              required
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min. 8 characters"
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute bottom-2.5 right-3 text-white/40 hover:text-white"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-white/60">Re-type password</label>
            <input
              required
              type={showConfirm ? 'text' : 'password'}
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              placeholder="Repeat password"
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute bottom-2.5 right-3 text-white/40 hover:text-white"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {createError && (
            <p className="rounded-xl bg-red-500/20 px-4 py-2.5 text-sm text-red-400">{createError}</p>
          )}
          {createSuccess && (
            <p className="rounded-xl bg-green/10 px-4 py-2.5 text-sm text-white/80">✓ {createSuccess}</p>
          )}

          <button
            type="submit"
            disabled={creating}
            className="min-h-[44px] w-full rounded-full bg-grad-blue crisp-on-dark px-6 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {creating ? 'Creating…' : 'Create counselor account'}
          </button>
        </form>
      </div>
    </div>
  )
}
