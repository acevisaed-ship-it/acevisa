'use client'

import { useEffect, useState } from 'react'
import { Save, Bell, Shield, Database, Palette, Users, Eye, EyeOff, Trash2, UserX } from 'lucide-react'

type Section = 'notifications' | 'security' | 'data' | 'appearance' | 'team'

interface Counselor {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  created_at: string
}

function SectionTab({ label, icon: Icon, active, onClick }: {
  label: string; icon: React.ElementType; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
        active ? 'tab-btn-active' : 'tab-btn-inactive'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium text-white/80">{label}</p>
        <p className="mt-0.5 text-xs text-white/50">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          checked ? 'bg-green' : 'bg-text/20'
        }`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  )
}

const inputCls = 'min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input'

function TeamSection() {
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

export function AdminSettings() {
  const [section, setSection] = useState<Section>('team')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const [notifs, setNotifs] = useState({
    newClient: true,
    complaint: true,
    escalation: true,
    meetingReminder: true,
    weeklyDigest: false,
  })

  const [security, setSecurity] = useState({
    requireMfa: false,
    sessionTimeout: '30',
    ipWhitelist: '',
  })

  const [appearance, setAppearance] = useState({
    compactMode: false,
    showAvatars: true,
    dateFormat: 'DD/MM/YYYY',
  })

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.notifications) setNotifs(d.settings.notifications)
        if (d.settings?.security) setSecurity(d.settings.security)
        if (d.settings?.appearance) setAppearance(d.settings.appearance)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    await Promise.all([
      fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'notifications', value: notifs }) }),
      fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'security', value: security }) }),
      fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'appearance', value: appearance }) }),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <p className="mt-8 text-sm text-white/40">Loading settings…</p>

  const isTeamSection = section === 'team'

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-white/60">Portal configuration</p>
        </div>
        {!isTeamSection && (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-full bg-grad-blue crisp-on-dark px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
          >
            <Save className="h-4 w-4" />
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {([
          { id: 'team' as Section, label: 'Team', icon: Users },
          { id: 'notifications' as Section, label: 'Notifications', icon: Bell },
          { id: 'security' as Section, label: 'Security', icon: Shield },
          { id: 'data' as Section, label: 'Data', icon: Database },
          { id: 'appearance' as Section, label: 'Appearance', icon: Palette },
        ]).map((tab) => (
          <SectionTab
            key={tab.id}
            label={tab.label}
            icon={tab.icon}
            active={section === tab.id}
            onClick={() => setSection(tab.id)}
          />
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 glass-card crisp-on-dark p-6">
        {section === 'team' && <TeamSection />}

        {section === 'notifications' && (
          <div>
            <h2 className="text-base font-semibold text-white">Notification Preferences</h2>
            <p className="mt-1 text-sm text-white/50">Choose which events trigger admin notifications.</p>
            <div className="mt-4 divide-y divide-white/8">
              <Toggle label="New client registered" description="Alert when a new client signs up via portal" checked={notifs.newClient} onChange={(v) => setNotifs({ ...notifs, newClient: v })} />
              <Toggle label="New complaint filed" description="Alert when a client submits a complaint" checked={notifs.complaint} onChange={(v) => setNotifs({ ...notifs, complaint: v })} />
              <Toggle label="Escalation raised" description="Alert when an AI chat escalation is created" checked={notifs.escalation} onChange={(v) => setNotifs({ ...notifs, escalation: v })} />
              <Toggle label="Meeting reminders" description="30-minute reminder before scheduled meetings" checked={notifs.meetingReminder} onChange={(v) => setNotifs({ ...notifs, meetingReminder: v })} />
              <Toggle label="Weekly performance digest" description="Summary email every Monday morning" checked={notifs.weeklyDigest} onChange={(v) => setNotifs({ ...notifs, weeklyDigest: v })} />
            </div>
          </div>
        )}

        {section === 'security' && (
          <div>
            <h2 className="text-base font-semibold text-white">Security Settings</h2>
            <p className="mt-1 text-sm text-white/50">Authentication and session policies.</p>
            <div className="mt-4 divide-y divide-white/8">
              <Toggle label="Require MFA for admins" description="Enforce two-factor auth on all admin accounts" checked={security.requireMfa} onChange={(v) => setSecurity({ ...security, requireMfa: v })} />
              <div className="py-4">
                <label className="text-sm font-medium text-white/80">Session timeout (minutes)</label>
                <p className="mt-0.5 text-xs text-white/50">Auto-logout after inactivity</p>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={security.sessionTimeout}
                  onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })}
                  className="mt-2 w-24 rounded-xl px-3 py-2 text-sm outline-none glass-input"
                />
              </div>
              <div className="py-4">
                <label className="text-sm font-medium text-white/80">IP Allowlist</label>
                <p className="mt-0.5 text-xs text-white/50">Comma-separated CIDRs (leave blank to allow all)</p>
                <input
                  type="text"
                  value={security.ipWhitelist}
                  onChange={(e) => setSecurity({ ...security, ipWhitelist: e.target.value })}
                  placeholder="e.g. 192.168.1.0/24, 10.0.0.1"
                  className="mt-2 w-full max-w-md rounded-xl px-3 py-2 text-sm outline-none glass-input"
                />
              </div>
            </div>
          </div>
        )}

        {section === 'data' && (
          <div>
            <h2 className="text-base font-semibold text-white">Data Management</h2>
            <p className="mt-1 text-sm text-white/50">Backup, export, and retention settings.</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-white/10 glass-card p-4">
                <p className="text-sm font-medium text-white/80">Export Client Data</p>
                <p className="mt-1 text-xs text-white/50">Download all client records as CSV</p>
                <button className="mt-3 rounded-full glass-card px-4 py-2 text-xs font-semibold text-white/70 hover:text-white">
                  Export CSV
                </button>
              </div>
              <div className="rounded-xl border border-white/10 glass-card p-4">
                <p className="text-sm font-medium text-white/80">Activity Log Retention</p>
                <p className="mt-1 text-xs text-white/50">Logs older than this are archived</p>
                <select className="mt-2 rounded-xl px-3 py-2 text-sm outline-none glass-input">
                  <option>90 days</option>
                  <option>180 days</option>
                  <option>1 year</option>
                  <option>Forever</option>
                </select>
              </div>
              <div className="rounded-xl border border-red-500/20 glass-card p-4">
                <p className="text-sm font-medium text-red-400">Danger Zone</p>
                <p className="mt-1 text-xs text-white/50">Permanently remove test/demo data</p>
                <button className="mt-3 rounded-full bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/30">
                  Clear Demo Data
                </button>
              </div>
            </div>
          </div>
        )}

        {section === 'appearance' && (
          <div>
            <h2 className="text-base font-semibold text-white">Appearance</h2>
            <p className="mt-1 text-sm text-white/50">Visual preferences for the admin portal.</p>
            <div className="mt-4 divide-y divide-white/8">
              <Toggle label="Compact mode" description="Reduce padding and font sizes in tables" checked={appearance.compactMode} onChange={(v) => setAppearance({ ...appearance, compactMode: v })} />
              <Toggle label="Show avatars" description="Display counselor/client avatars throughout portal" checked={appearance.showAvatars} onChange={(v) => setAppearance({ ...appearance, showAvatars: v })} />
              <div className="py-4">
                <label className="text-sm font-medium text-white/80">Date format</label>
                <p className="mt-0.5 text-xs text-white/50">How dates appear across the portal</p>
                <select
                  value={appearance.dateFormat}
                  onChange={(e) => setAppearance({ ...appearance, dateFormat: e.target.value })}
                  className="mt-2 rounded-xl px-3 py-2 text-sm outline-none glass-input"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
