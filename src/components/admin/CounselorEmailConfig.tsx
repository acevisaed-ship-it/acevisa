'use client'

import { useEffect, useState } from 'react'
import { Mail, ChevronDown, ChevronUp, Eye, EyeOff, Trash2 } from 'lucide-react'

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
  imap_host: 'mail.bluehost.com',
  imap_port: 993,
  smtp_host: 'mail.bluehost.com',
  smtp_port: 465,
  is_active: true,
}

export function CounselorEmailConfig({ counselorId }: { counselorId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [config, setConfig] = useState<Config>(DEFAULTS)
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/admin/counselors/${counselorId}/email-config`)
      .then((r) => r.json())
      .then(({ config: data }) => {
        if (data) {
          setConfig({
            email_address: data.email_address ?? '',
            display_name: data.display_name ?? '',
            imap_host: data.imap_host ?? 'mail.bluehost.com',
            imap_port: data.imap_port ?? 993,
            smtp_host: data.smtp_host ?? 'mail.bluehost.com',
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
  }, [open, counselorId])

  async function handleSave() {
    if (!config.email_address || !password) {
      setStatus('error')
      return
    }
    setSaving(true)
    setStatus('idle')
    try {
      const res = await fetch(`/api/admin/counselors/${counselorId}/email-config`, {
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
    if (!confirm('Remove this counselor\'s email configuration?')) return
    await fetch(`/api/admin/counselors/${counselorId}/email-config`, { method: 'DELETE' })
    setConfig(DEFAULTS)
    setPassword('')
    setHasExisting(false)
    setStatus('idle')
  }

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm text-white/60 hover:text-white/90"
      >
        <span className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" />
          {hasExisting ? (
            <span className="text-green-400/80">Email connected — {config.email_address || '…'}</span>
          ) : (
            <span>Connect email account</span>
          )}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {loading ? (
            <p className="text-xs text-white/40">Loading…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-white/50">Email address</label>
                  <input
                    type="email"
                    value={config.email_address}
                    onChange={(e) => setConfig((c) => ({ ...c, email_address: e.target.value }))}
                    placeholder="name@acevisa.co"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/25"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-white/50">Display name</label>
                  <input
                    type="text"
                    value={config.display_name}
                    onChange={(e) => setConfig((c) => ({ ...c, display_name: e.target.value }))}
                    placeholder="Arooj – ACE Altius"
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
                      placeholder={hasExisting ? '••••••••' : 'Bluehost / Gmail app password'}
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
