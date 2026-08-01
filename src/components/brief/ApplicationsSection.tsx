'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { BriefCard } from './BriefCard'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS, type ApplicationStatus } from '@/lib/applications'

type Application = {
  id: string
  institution_name: string
  program_name: string | null
  country: string | null
  status: string
}

type Props = { clientId: string; applications: Application[] }

export function ApplicationsSection({ clientId, applications: initial }: Props) {
  const [applications, setApplications] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [institution, setInstitution] = useState('')
  const [program, setProgram] = useState('')
  const [country, setCountry] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!institution.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/counselor/clients/${clientId}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution_name: institution, program_name: program, country }),
      })
      const data = await res.json()
      if (res.ok) {
        setApplications((prev) => [data.application, ...prev])
        setInstitution(''); setProgram(''); setCountry(''); setAdding(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(applicationId: string, status: string) {
    setApplications((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status } : a)))
    await fetch(`/api/counselor/applications/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  return (
    <BriefCard>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Applications <span className="text-white/40">({applications.length})</span>
        </h3>
        <button type="button" onClick={() => setAdding((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-blue hover:underline">
          {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {adding ? 'Cancel' : 'Add application'}
        </button>
      </div>

      {adding && (
        <div className="mb-4 space-y-2 rounded-xl border border-white/10 p-3">
          <input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Institution name" className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
          <input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Program / course (optional)" className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country (optional)" className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
          <button type="button" onClick={handleAdd} disabled={saving || !institution.trim()} className="w-full rounded-full bg-green py-2 text-sm font-bold text-text disabled:opacity-50">
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      )}

      {applications.length === 0 ? (
        <p className="text-sm text-white/40">No applications lodged yet.</p>
      ) : (
        <div className="space-y-2">
          {applications.map((app) => (
            <div key={app.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-white">{app.institution_name}</p>
                <p className="text-xs text-white/40">{[app.program_name, app.country].filter(Boolean).join(' — ') || '—'}</p>
              </div>
              <select
                value={app.status}
                onChange={(e) => handleStatusChange(app.id, e.target.value)}
                className="rounded-full px-2 py-1 text-xs font-semibold outline-none"
                style={{ background: `${APPLICATION_STATUS_COLORS[app.status as ApplicationStatus] ?? '#2083B9'}26`, color: APPLICATION_STATUS_COLORS[app.status as ApplicationStatus] ?? '#2083B9' }}
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s} style={{ color: '#000' }}>{APPLICATION_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </BriefCard>
  )
}
