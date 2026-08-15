'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Trash2, UserX, KeyRound } from 'lucide-react'

interface Counselor {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  role: string
  created_at: string
}

type Branch = { id: string; name: string }

const inputCls = 'min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input'

const rolesForAdmin = [
  { value: 'counselor', label: 'Counselor' },
  { value: 'receptionist', label: 'Receptionist' },
]
const rolesForCeo = [
  ...rolesForAdmin,
  { value: 'admin', label: 'Branch Manager' },
]

export function CounselorAccountsPanel({ isCeo = false }: { isCeo?: boolean }) {
  const [counselors, setCounselors] = useState<Counselor[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [branches, setBranches] = useState<Branch[]>([])

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', password: '', confirm: '',
    role: 'counselor', branchId: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  const [actionId, setActionId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const [resetOpenId, setResetOpenId] = useState<string | null>(null)
  const [resetMode, setResetMode] = useState<'generate' | 'custom'>('generate')
  const [resetCustomPw, setResetCustomPw] = useState('')
  const [resetShowPw, setResetShowPw] = useState(false)
  const [resetBusyId, setResetBusyId] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<{ id: string; password: string } | null>(null)

  function loadCounselors() {
    setLoadingList(true)
    fetch('/api/admin/counselors/list')
      .then((r) => r.json())
      .then((d) => setCounselors(d.counselors || []))
      .finally(() => setLoadingList(false))
  }

  useEffect(() => { loadCounselors() }, [])

  useEffect(() => {
    if (!isCeo) return
    fetch('/api/admin/branches')
      .then((r) => r.json())
      .then((d) => setBranches(d.branches || []))
  }, [isCeo])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)

    if (isCeo && !form.branchId) {
      setCreateError('Please select a branch')
      return
    }

    const emailLower = form.email.toLowerCase()
    if (!emailLower.endsWith('@aceyourvisa.com') && !emailLower.endsWith('@acevisa.co')) {
      setCreateError('Email must end with @aceyourvisa.com')
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
        role: form.role,
        branchId: form.branchId || undefined,
      }),
    })
    const data = await res.json()
    setCreating(false)

    if (!res.ok) {
      setCreateError(data.error || 'Failed to create counselor')
      return
    }

    setCreateSuccess(`${form.firstName} ${form.lastName} has been added. They can now log in at /login.`)
    setForm({ firstName: '', lastName: '', phone: '', email: '', password: '', confirm: '', role: 'counselor', branchId: '' })
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

  function openReset(id: string) {
    setResetOpenId(id)
    setResetMode('generate')
    setResetCustomPw('')
    setResetShowPw(false)
    setResetError(null)
    setResetResult(null)
  }

  function closeReset() {
    setResetOpenId(null)
    setResetError(null)
  }

  async function handleResetPassword(id: string) {
    setResetError(null)

    if (resetMode === 'custom') {
      if (resetCustomPw.length < 8) {
        setResetError('Password must be at least 8 characters')
        return
      }
    }

    setResetBusyId(id)
    const res = await fetch(`/api/admin/counselors/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resetMode === 'custom' ? { password: resetCustomPw } : {}),
    })
    const data = await res.json()
    setResetBusyId(null)

    if (!res.ok) {
      setResetError(data.error || 'Could not reset password')
      return
    }

    if (data.generatedPassword) {
      setResetResult({ id, password: data.generatedPassword })
    } else {
      setResetResult({ id, password: '' }) // custom password set, nothing to show
    }
    setResetCustomPw('')
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
                className="rounded-xl border border-white/10 glass-card px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white/80">{c.name}</p>
                    <p className="text-xs text-white/50">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    c.status === 'active' ? 'bg-green/20 text-white' : 'glass-card text-white/40'
                  }`}>
                    {c.status.toUpperCase()}
                  </span>

                  {['counselor', 'receptionist'].includes(c.role) && (
                    <button
                      onClick={() => (resetOpenId === c.id ? closeReset() : openReset(c.id))}
                      title="Reset password"
                      className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Reset password
                    </button>
                  )}

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
                </div>

                {resetOpenId === c.id && (
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
                    {resetResult?.id === c.id ? (
                      <div className="space-y-2">
                        {resetResult.password ? (
                          <>
                            <p className="text-xs text-white/60">
                              New temporary password for <span className="font-semibold text-white/80">{c.name}</span> — share this with them, it won&apos;t be shown again:
                            </p>
                            <p className="rounded-lg bg-black/30 px-3 py-2 font-mono text-sm font-bold text-green">
                              {resetResult.password}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-white/60">
                            ✓ Password updated for <span className="font-semibold text-white/80">{c.name}</span>. They&apos;ve been notified by email.
                          </p>
                        )}
                        <button
                          onClick={closeReset}
                          className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/60 hover:text-white"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-white/70">
                          Reset password for {c.name}?
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <label className="flex items-center gap-1.5 text-white/60">
                            <input
                              type="radio"
                              checked={resetMode === 'generate'}
                              onChange={() => setResetMode('generate')}
                            />
                            Generate a temporary password
                          </label>
                          <label className="flex items-center gap-1.5 text-white/60">
                            <input
                              type="radio"
                              checked={resetMode === 'custom'}
                              onChange={() => setResetMode('custom')}
                            />
                            Set a specific password
                          </label>
                        </div>
                        {resetMode === 'custom' && (
                          <div className="relative max-w-xs">
                            <input
                              type={resetShowPw ? 'text' : 'password'}
                              value={resetCustomPw}
                              onChange={(e) => setResetCustomPw(e.target.value)}
                              placeholder="Min. 8 characters"
                              className={`${inputCls} pr-10`}
                            />
                            <button
                              type="button"
                              onClick={() => setResetShowPw((v) => !v)}
                              className="absolute inset-y-0 right-3 text-white/40 hover:text-white"
                            >
                              {resetShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        )}
                        {resetError && (
                          <p className="text-xs text-red-400">{resetError}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResetPassword(c.id)}
                            disabled={resetBusyId === c.id}
                            className="rounded-full bg-grad-blue crisp-on-dark px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {resetBusyId === c.id ? 'Resetting…' : 'Confirm reset'}
                          </button>
                          <button
                            onClick={closeReset}
                            className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/60 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
          Email must end with <span className="font-mono font-semibold">@aceyourvisa.com</span>.
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputCls}
              >
                {(isCeo ? rolesForCeo : rolesForAdmin).map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            {isCeo && (
              <div>
                <label className="mb-1 block text-xs font-medium text-white/60">Branch</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select branch…</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">
              Email address <span className="text-orange">(@aceyourvisa.com)</span>
            </label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@aceyourvisa.com"
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
