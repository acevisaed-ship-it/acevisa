'use client'

import { useEffect, useState } from 'react'
import { Save, Bell, Shield, Database, Palette } from 'lucide-react'

type Section = 'notifications' | 'security' | 'data' | 'appearance'

function SectionTab({ label, icon: Icon, active, onClick }: {
  label: string; icon: React.ElementType; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
        active ? 'bg-text text-bg' : 'text-text/60 hover:bg-text/10 hover:text-text'
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
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="mt-0.5 text-xs text-text/50">{description}</p>
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

export function AdminSettings() {
  const [section, setSection] = useState<Section>('notifications')
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

  if (loading) return <p className="mt-8 text-sm text-text/40">Loading settings…</p>

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-blue md:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-text/60">Portal configuration</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-full bg-text px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-80"
        >
          <Save className="h-4 w-4" />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {([
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

      <div className="mt-4 rounded-2xl border border-text/10 bg-white p-6">
        {section === 'notifications' && (
          <div>
            <h2 className="text-base font-semibold text-text">Notification Preferences</h2>
            <p className="mt-1 text-sm text-text/50">Choose which events trigger admin notifications.</p>
            <div className="mt-4 divide-y divide-text/8">
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
            <h2 className="text-base font-semibold text-text">Security Settings</h2>
            <p className="mt-1 text-sm text-text/50">Authentication and session policies.</p>
            <div className="mt-4 divide-y divide-text/8">
              <Toggle label="Require MFA for admins" description="Enforce two-factor auth on all admin accounts" checked={security.requireMfa} onChange={(v) => setSecurity({ ...security, requireMfa: v })} />
              <div className="py-4">
                <label className="text-sm font-medium text-text">Session timeout (minutes)</label>
                <p className="mt-0.5 text-xs text-text/50">Auto-logout after inactivity</p>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={security.sessionTimeout}
                  onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })}
                  className="mt-2 w-24 rounded-xl border border-text/20 bg-bg px-3 py-2 text-sm text-text outline-none focus:border-blue"
                />
              </div>
              <div className="py-4">
                <label className="text-sm font-medium text-text">IP Allowlist</label>
                <p className="mt-0.5 text-xs text-text/50">Comma-separated CIDRs (leave blank to allow all)</p>
                <input
                  type="text"
                  value={security.ipWhitelist}
                  onChange={(e) => setSecurity({ ...security, ipWhitelist: e.target.value })}
                  placeholder="e.g. 192.168.1.0/24, 10.0.0.1"
                  className="mt-2 w-full max-w-md rounded-xl border border-text/20 bg-bg px-3 py-2 text-sm text-text outline-none focus:border-blue"
                />
              </div>
            </div>
          </div>
        )}

        {section === 'data' && (
          <div>
            <h2 className="text-base font-semibold text-text">Data Management</h2>
            <p className="mt-1 text-sm text-text/50">Backup, export, and retention settings.</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-text/10 p-4">
                <p className="text-sm font-medium text-text">Export Client Data</p>
                <p className="mt-1 text-xs text-text/50">Download all client records as CSV</p>
                <button className="mt-3 rounded-full bg-bg px-4 py-2 text-xs font-semibold text-text hover:bg-text/10">
                  Export CSV
                </button>
              </div>
              <div className="rounded-xl border border-text/10 p-4">
                <p className="text-sm font-medium text-text">Activity Log Retention</p>
                <p className="mt-1 text-xs text-text/50">Logs older than this are archived</p>
                <select className="mt-2 rounded-xl border border-text/20 bg-bg px-3 py-2 text-sm text-text outline-none">
                  <option>90 days</option>
                  <option>180 days</option>
                  <option>1 year</option>
                  <option>Forever</option>
                </select>
              </div>
              <div className="rounded-xl border border-red-100 p-4">
                <p className="text-sm font-medium text-red-600">Danger Zone</p>
                <p className="mt-1 text-xs text-text/50">Permanently remove test/demo data</p>
                <button className="mt-3 rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100">
                  Clear Demo Data
                </button>
              </div>
            </div>
          </div>
        )}

        {section === 'appearance' && (
          <div>
            <h2 className="text-base font-semibold text-text">Appearance</h2>
            <p className="mt-1 text-sm text-text/50">Visual preferences for the admin portal.</p>
            <div className="mt-4 divide-y divide-text/8">
              <Toggle label="Compact mode" description="Reduce padding and font sizes in tables" checked={appearance.compactMode} onChange={(v) => setAppearance({ ...appearance, compactMode: v })} />
              <Toggle label="Show avatars" description="Display counselor/client avatars throughout portal" checked={appearance.showAvatars} onChange={(v) => setAppearance({ ...appearance, showAvatars: v })} />
              <div className="py-4">
                <label className="text-sm font-medium text-text">Date format</label>
                <p className="mt-0.5 text-xs text-text/50">How dates appear across the portal</p>
                <select
                  value={appearance.dateFormat}
                  onChange={(e) => setAppearance({ ...appearance, dateFormat: e.target.value })}
                  className="mt-2 rounded-xl border border-text/20 bg-bg px-3 py-2 text-sm text-text outline-none focus:border-blue"
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
