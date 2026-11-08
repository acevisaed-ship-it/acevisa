'use client'

import { useEffect, useState } from 'react'

type Country = { id: string; name: string }
type Institution = { id: string; name: string; country_id: string | null; is_partner: boolean }
type Agent = { id: string; name: string; institution_ids: string[] }

const SOURCES: { value: string; label: string }[] = [
  { value: 'agent', label: 'Agent' }, { value: 'counselor_referral', label: 'Counselor referral' }, { value: 'walk_in', label: 'Walk-in' },
  { value: 'campaign', label: 'Campaign' }, { value: 'direct', label: 'Direct' }, { value: 'other', label: 'Other' },
]

type Row = Record<string, unknown>

/** Sets country, institution, agent, source and application date on one case. Opened from the cases register. */
export function CaseDetailsDialog({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const [countries, setCountries] = useState<Country[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [countryId, setCountryId] = useState('')
  const [universityId, setUniversityId] = useState('')
  const [other, setOther] = useState(String(row.institution_other ?? ''))
  const [agentId, setAgentId] = useState('')
  const [sourceType, setSourceType] = useState(String(row.source_type ?? ''))
  const [appliedAt, setAppliedAt] = useState(String(row.applied_at ?? '').slice(0, 10))
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/admin/reference')
      if (!res.ok) { setMsg('Could not load lists'); return }
      const json = await res.json()
      const cs = (json.countries ?? []) as Country[]; const is = (json.institutions ?? []) as Institution[]; const as = (json.agents ?? []) as Agent[]
      setCountries(cs); setInstitutions(is); setAgents(as)
      // The register shows names, so match them back to ids
      setCountryId(cs.find((c) => c.name === row.country)?.id ?? '')
      setUniversityId(is.find((i) => i.name === row.university)?.id ?? '')
      setAgentId(as.find((a) => a.name === row.agent_name)?.id ?? '')
    })()
  }, [row])

  const shownInstitutions = institutions.filter((i) => !countryId || i.country_id === countryId)
  const picked = institutions.find((i) => i.id === universityId)
  const shownAgents = universityId ? agents.filter((a) => a.institution_ids.includes(universityId) || a.id === agentId) : agents

  async function save() {
    setBusy(true); setMsg('')
    const res = await fetch('/api/admin/case-details', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: row.deal_id, countryId, universityId, institutionOther: other, agentId, sourceType, appliedAt }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) { setMsg(json.error || 'Could not save'); return }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl p-5 glass-card text-sm text-white">
        <h3 className="mb-1 text-base font-semibold">Case details</h3>
        <p className="mb-4 text-white/60">{String(row.client_name ?? '')}</p>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">Country
            <select className="glass-input rounded-full px-3 py-2" value={countryId} onChange={(e) => { setCountryId(e.target.value); setUniversityId('') }}>
              <option value="">Not set</option>{countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="flex flex-col gap-1">Institution
            <select className="glass-input rounded-full px-3 py-2" value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
              <option value="">Other (not listed)</option>{shownInstitutions.map((i) => <option key={i.id} value={i.id}>{i.name}{i.is_partner ? ' ★ partner' : ''}</option>)}</select></label>
          {!universityId && (
            <label className="flex flex-col gap-1">Institution name (not in the list)
              <input className="glass-input rounded-full px-3 py-2" value={other} onChange={(e) => setOther(e.target.value)} /></label>)}
          {picked && <p className="text-xs text-white/60">{picked.is_partner ? 'Partner institution' : 'Non-partner institution'}</p>}
          <label className="flex flex-col gap-1">Agent
            <select className="glass-input rounded-full px-3 py-2" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              <option value="">No agent</option>{shownAgents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label className="flex flex-col gap-1">Where the student came from
            <select className="glass-input rounded-full px-3 py-2" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
              <option value="">Not set</option>{SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
          <label className="flex flex-col gap-1">Application date
            <input type="date" className="glass-input rounded-full px-3 py-2" value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)} /></label>
        </div>
        {msg && <p className="mt-3 text-amber-300">{msg}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="min-h-[40px] rounded-full px-4 glass-input" onClick={onClose}>Cancel</button>
          <button className="min-h-[40px] rounded-full px-4 btn-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
