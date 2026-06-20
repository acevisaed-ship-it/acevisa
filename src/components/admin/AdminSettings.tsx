'use client'

import { useEffect, useState } from 'react'
import { Save, Bell, Shield, Database, Palette, MapPin } from 'lucide-react'

type Section = 'notifications' | 'security' | 'data' | 'appearance' | 'office'

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

export function AdminSettings() {
  const [section, setSection] = useState<Section>('office')
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

  const [office, setOffice] = useState({
    ip: '',
    lat: '',
    lng: '',
    radius: '100',
  })
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.notifications) setNotifs(d.settings.notifications)
        if (d.settings?.security) setSecurity(d.settings.security)
        if (d.settings?.appearance) setAppearance(d.settings.appearance)
        if (d.settings?.office_location) setOffice(d.settings.office_location)
      })
      .finally(() => setLoading(false))
  }, [])

  function useMyLocation() {
    setLocateError(null)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOffice((o) => ({ ...o, lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) }))
        setLocating(false)
      },
      () => {
        setLocateError('Could not get location. Allow browser location access and try again.')
        setLocating(false)
      }
    )
  }

  async function handleSave() {
    await Promise.all([
      fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'notifications', value: notifs }) }),
      fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'security', value: security }) }),
      fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'appearance', value: appearance }) }),
      fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'office_location', value: office }) }),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <p className="mt-8 text-sm text-white/40">Loading settings…</p>

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-white/60">Portal configuration</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-full bg-grad-blue crisp-on-dark px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
        >
          <Save className="h-4 w-4" />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {([
          { id: 'office' as Section, label: 'Office Location', icon: MapPin },
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

      <div className="mt-4 rounded-2xl glass-card crisp-on-dark p-6">
        {section === 'office' && (
          <div>
            <h2 className="text-base font-semibold text-white">Office Location</h2>
            <p className="mt-1 text-sm text-white/50">
              Counselors can only clock in when physically at the office — verified by IP address and GPS location.
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-white/60">Office Public IP Address</label>
                <input
                  type="text"
                  value={office.ip}
                  onChange={(e) => setOffice({ ...office, ip: e.target.value })}
                  placeholder="e.g. 203.101.54.12"
                  className="min-h-[44px] w-full max-w-sm rounded-xl px-3 py-2 text-sm outline-none glass-input"
                />
                <p className="mt-1 text-xs text-white/40">Find this at whatismyip.com from the office network</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-sm">
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/60">Latitude</label>
                  <input
                    type="text"
                    value={office.lat}
                    onChange={(e) => setOffice({ ...office, lat: e.target.value })}
                    placeholder="e.g. 31.5204"
                    className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/60">Longitude</label>
                  <input
                    type="text"
                    value={office.lng}
                    onChange={(e) => setOffice({ ...office, lng: e.target.value })}
                    placeholder="e.g. 74.3587"
                    className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:text-white disabled:opacity-40"
              >
                <MapPin className="h-4 w-4" />
                {locating ? 'Detecting…' : 'Use my current location'}
              </button>
              {locateError && <p className="text-xs text-red-400">{locateError}</p>}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/60">Allowed Radius (metres)</label>
                <input
                  type="number"
                  min="50"
                  max="1000"
                  value={office.radius}
                  onChange={(e) => setOffice({ ...office, radius: e.target.value })}
                  className="min-h-[44px] w-24 rounded-xl px-3 py-2 text-sm outline-none glass-input"
                />
                <p className="mt-1 text-xs text-white/40">Counselor must be within this distance of the office to clock in</p>
              </div>
            </div>
          </div>
        )}

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
