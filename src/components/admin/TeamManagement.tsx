'use client'

import { useEffect, useState } from 'react'
import { UserPlus, CheckCircle, XCircle, Pencil, X, Check, Clock } from 'lucide-react'

type Counselor = {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive'
  role: 'counselor' | 'admin'
  clientCount: number
  avatarUrl: string | null
}

type TeamPanelMetrics = {
  counselorId: string
  openCount: number
  inProgressCount: number
  completedTodayCount: number
  closedTodayCount: number
  remainingTodayCount: number
  portalActiveMinutes: number
  attendanceMinutes: number | null
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

type NewCounselor = {
  name: string
  email: string
  password: string
  role: 'counselor' | 'admin'
}

export function TeamManagement() {
  const [counselors, setCounselors] = useState<Counselor[]>([])
  const [metrics, setMetrics] = useState<Map<string, TeamPanelMetrics>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [form, setForm] = useState<NewCounselor>({ name: '', email: '', password: '', role: 'counselor' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/team')
      .then((r) => r.json())
      .then((d) => setCounselors(d.counselors ?? []))
      .finally(() => setLoading(false))

    fetch('/api/admin/team-metrics')
      .then((r) => r.json())
      .then((d) => {
        const map = new Map<string, TeamPanelMetrics>()
        for (const m of d.metrics ?? []) map.set(m.counselorId, m)
        setMetrics(map)
      })
      .catch(() => {
        // Non-critical — metrics columns just show placeholders.
      })
  }, [])

  async function addCounselor() {
    if (!form.name || !form.email || !form.password) {
      setError('Name, email and password are required.')
      return
    }
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to create counselor')
    } else {
      setCounselors((prev) => [data.counselor, ...prev])
      setShowAdd(false)
      setForm({ name: '', email: '', password: '', role: 'counselor' })
    }
    setSaving(false)
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    const res = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    })
    if (res.ok) {
      setCounselors((prev) => prev.map((c) => c.id === id ? { ...c, status: newStatus as 'active' | 'inactive' } : c))
    }
  }

  async function saveName(id: string) {
    const res = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editName }),
    })
    if (res.ok) {
      setCounselors((prev) => prev.map((c) => c.id === id ? { ...c, name: editName } : c))
      setEditingId(null)
    }
  }

  const active = counselors.filter((c) => c.status === 'active').length

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Team Management</h1>
          <p className="mt-1 text-sm text-white/60">
            {active} active · {counselors.length} total
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setError(null) }}
          className="flex items-center gap-2 rounded-full bg-grad-blue crisp-on-dark px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
        >
          <UserPlus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {showAdd && (
        <div className="mt-6 rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
          <h2 className="mb-4 text-base font-semibold text-white">New Team Member</h2>
          {error && <p className="mb-3 rounded-xl bg-red-500/20 px-3 py-2 text-sm text-red-400">{error}</p>}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                className="w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Temporary password"
                className="w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as 'counselor' | 'admin' })}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
              >
                <option value="counselor">Counselor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={addCounselor}
              disabled={saving}
              className="rounded-full bg-grad-blue crisp-on-dark px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setError(null) }}
              className="rounded-full glass-card px-4 py-2 text-sm font-semibold text-white/60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl glass-card" />
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 glass-card crisp-on-dark">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wide text-white/40">
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Clients</th>
                <th className="px-4 py-3" title="Open tasks">Open</th>
                <th className="px-4 py-3" title="In-progress tasks">In Progress</th>
                <th className="px-4 py-3" title="Completed today">Done Today</th>
                <th className="px-4 py-3" title="Closed today">Closed Today</th>
                <th className="px-4 py-3" title="Due today or overdue, not yet done">Remaining Today</th>
                <th className="px-4 py-3" title="Active time on portal today (heartbeat)">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Time Today</span>
                </th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {counselors.map((c) => {
                const m = metrics.get(c.id)
                return (
                <tr key={c.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full glass-card-md text-xs font-semibold text-white/70">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        {editingId === c.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="rounded px-2 py-0.5 text-sm outline-none glass-input"
                            />
                            <button onClick={() => saveName(c.id)} className="text-green hover:opacity-80">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-white/40 hover:text-white">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <p className="font-medium text-white/80">{c.name}</p>
                        )}
                        <p className="text-xs text-white/50">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      c.role === 'admin' ? 'bg-blue/20 text-white' : 'glass-card text-white/60'
                    }`}>
                      {c.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">{c.clientCount}</td>
                  <td className="px-4 py-3 text-white/60">{m ? m.openCount : '—'}</td>
                  <td className="px-4 py-3 text-white/60">{m ? m.inProgressCount : '—'}</td>
                  <td className="px-4 py-3 text-white/60">{m ? m.completedTodayCount : '—'}</td>
                  <td className="px-4 py-3 text-white/60">{m ? m.closedTodayCount : '—'}</td>
                  <td className={`px-4 py-3 font-medium ${m && m.remainingTodayCount > 0 ? 'text-yellow-400' : 'text-white/60'}`}>
                    {m ? m.remainingTodayCount : '—'}
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    <div className="flex flex-col leading-tight">
                      <span>{m ? formatMinutes(m.portalActiveMinutes) : '—'}</span>
                      {m?.attendanceMinutes != null && (
                        <span className="text-xs text-white/30">clocked {formatMinutes(m.attendanceMinutes)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      c.status === 'active'
                        ? 'bg-green/20 text-white'
                        : 'glass-card text-white/40'
                    }`}>
                      {c.status === 'active'
                        ? <CheckCircle className="h-3 w-3" />
                        : <XCircle className="h-3 w-3" />}
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingId(c.id); setEditName(c.name) }}
                        className="rounded-lg p-1.5 text-white/40 hover:glass-card hover:text-white"
                        title="Edit name"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleStatus(c.id, c.status)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 ${
                          c.status === 'active'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-green/20 text-white'
                        }`}
                      >
                        {c.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
