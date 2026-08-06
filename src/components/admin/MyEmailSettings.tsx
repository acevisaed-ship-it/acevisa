'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Trash2 } from 'lucide-react'

type Config = {
  id?: string
  email_address: string
  display_name: string
  imap_host: string
  imap_port: number
  smtp_host: string
  smtp_port: number
  is_active: boolean
}

const DEFAULTS: Config = {
  email_address: '',
  display_name: '',
  imap_host: 'box2422.bluehost.com',
  imap_port: 993,
  smtp_host: 'box2422.bluehost.com',
  smtp_port: 465,
  is_active: true,
}

export function MyEmailSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [config, setConfig] = useState<Config>(DEFAULTS)
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/admin/my-email-config')
      .then((r) => r.json())
      .then(({ config: data }) => {
        if (data) {
          setConfig({
            email_address: data.email_address ?? '',
            display_name: data.display_name ?? '',
            imap_host: data.imap_host ?? 'box2422.bluehost.com',
            imap_port: data.imap_port ?? 993,
            smtp_host: data.smtp_host ?? 'box2422.bluehost.com',
            smtp_port: data.smtp_port ?? 465,
            is_active: data.is_active ?? true,
          })
          setHasExisting(true)
        } else {
          setConfig(DEFAULTS)
          setHasExisting(false)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!config.email_address || !password) {
      setStatus('error')
      return
    }
    setSaving(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/admin/my-email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, app_password: password }),
      })
      if (!res.ok) throw new Error('Failed')
      setStatus('saved')
      setHasExisting(true)
      setPassword('')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Remove your email configuration?')) return
    await fetch('/api/admin/my-email-config', { method: 'DELETE' })
    setConfig(DEFAULTS)
    setPassword('')
    setHasExisting(false)
    setStatus('idle')
  }

  if (loading) return <p className="text-sm text-white/40">Loading…</p>

  return (
    <div>
      <h2 className="text-base font-semibold text-white">My Email</h2>
      <p className="mt-1 text-sm text-white/50">
        Connect your personal CEO mailbox. Only you can view or change these credentials.
      </p>

      <div className="mt-6 space-y-3 max-w-lg">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-white/50">Email address</label>
            <input
              type="email"
              value={config.email_address}
              onChange={(e) => setConfig((c) => ({ ...c, email_address: e.target.value }))}
              placeholder="ceo@aceyourvisa.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/25"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-white/50">Display name</label>
            <input
              type="text"
              value={config.display_name}
              onChange={(e) => setConfig((c) => ({ ...c, display_name: e.target.value }))}
              placeholder="CEO – ACE Altius"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/25"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">IMAP host</label>
            <input
              type="text"
              value={config.imap_host}
              onChange={(e) => setConfig((c) => ({ ...c, imap_host: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/25"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">IMAP port</label>
            <input
              type="number"
              value={config.imap_port}
              onChange={(e) => setConfig((c) => ({ ...c, imap_port: Number(e.target.value) }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">SMTP host</label>
            <input
              type="text"
              value={config.smtp_host}
              onChange={(e) => setConfig((c) => ({ ...c, smtp_host: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/25"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">SMTP port</label>
            <input
              type="number"
              value={config.smtp_port}
              onChange={(e) => setConfig((c) => ({ ...c, smtp_port: Number(e.target.value) }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-white/50">
              App password{hasExisting && <span className="ml-1 text-white/30">(leave blank to keep existing)</span>}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={hasExisting ? '••••••••' : 'Bluehost mailbox password'}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-9 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/25"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {status === 'error' && (
          <p className="text-xs text-red-400">Email address and password are required.</p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-full bg-blue-600/70 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : status === 'saved' ? '✓ Saved' : 'Save email config'}
          </button>
          {hasExisting && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-full border border-white/10 p-2 text-white/40 hover:border-red-400/40 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
