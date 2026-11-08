'use client'

import { useCallback, useEffect, useState } from 'react'

type Country = { id: string; name: string }
type Institution = { id: string; name: string; short_code: string | null; is_partner: boolean; country_id: string | null; is_active: boolean }
type Agent = { id: string; name: string; phone: string | null; email: string | null; is_active: boolean; institution_ids: string[] }

/**
 * Head-office setup for the lists the reports filter on: institutions (with partner flag) and agents
 * (attached to partner institutions). Admissions and course data stay in their own system; this holds only
 * what Accounts needs to report on.
 */
export function ReferenceSetupPanel() {
  const [countries, setCountries] = useState<Country[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [msg, setMsg] = useState('')
  const [inst, setInst] = useState<{ id?: string; name: string; countryId: string; shortCode: string; isPartner: boolean }>({ name: '', countryId: '', shortCode: '', isPartner: false })
  const [ag, setAg] = useState<{ id?: string; name: string; phone: string; email: string; institutionIds: string[] }>({ name: '', phone: '', email: '', institutionIds: [] })

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/reference')
    if (!res.ok) { setMsg('Could not load lists'); return }
    const json = await res.json()
    setCountries(json.countries ?? []); setInstitutions(json.institutions ?? []); setAgents(json.agents ?? [])
  }, [])
  useEffect(() => { void load() }, [load])

  async function post(payload: Record<string, unknown>, okMsg: string) {
    const res = await fetch('/api/admin/reference', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    setMsg(res.ok ? okMsg : (json.error || 'Failed'))
    if (res.ok) await load()
    return res.ok
  }

  const countryName = (id: string | null) => countries.find((c) => c.id === id)?.name ?? ''
  const partners = institutions.filter((i) => i.is_partner && i.is_active)

  return (
    <div className="flex flex-col gap-6 text-sm text-white">
      {msg && <p className="text-amber-300">{msg}</p>}

      <section className="rounded-2xl p-4 glass-card">
        <h3 className="mb-3 text-base font-semibold">Institutions</h3>
        <div className="flex flex-wrap items-end gap-2">
          <input className="glass-input rounded-full px-3 py-2" placeholder="Institution name" value={inst.name} onChange={(e) => setInst({ ...inst, name: e.target.value })} />
          <select className="glass-input rounded-full px-3 py-2" value={inst.countryId} onChange={(e) => setInst({ ...inst, countryId: e.target.value })}>
            <option value="">Country…</option>{countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input className="glass-input w-28 rounded-full px-3 py-2" placeholder="Short code" value={inst.shortCode} onChange={(e) => setInst({ ...inst, shortCode: e.target.value })} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={inst.isPartner} onChange={(e) => setInst({ ...inst, isPartner: e.target.checked })} />Partner</label>
          <button className="min-h-[40px] rounded-full px-4 btn-primary" onClick={async () => {
            if (await post({ action: 'institution.save', ...inst }, inst.id ? 'Institution updated' : 'Institution added')) setInst({ name: '', countryId: '', shortCode: '', isPartner: false })
          }}>{inst.id ? 'Update' : 'Add institution'}</button>
          {inst.id && <button className="text-xs underline" onClick={() => setInst({ name: '', countryId: '', shortCode: '', isPartner: false })}>cancel edit</button>}
        </div>
        <div className="mt-3 max-h-80 overflow-auto">
          <table className="w-full">
            <thead><tr className="text-left text-white/60"><th className="p-2">Name</th><th className="p-2">Country</th><th className="p-2">Code</th><th className="p-2">Partner</th><th className="p-2" /></tr></thead>
            <tbody>
              {institutions.map((i) => (
                <tr key={i.id} className="border-t border-white/10">
                  <td className="p-2">{i.name}</td><td className="p-2">{countryName(i.country_id)}</td><td className="p-2">{i.short_code}</td>
                  <td className="p-2">{i.is_partner ? 'yes' : 'no'}</td>
                  <td className="p-2"><button className="text-xs underline" onClick={() => setInst({ id: i.id, name: i.name, countryId: i.country_id ?? '', shortCode: i.short_code ?? '', isPartner: i.is_partner })}>edit</button></td>
                </tr>))}
              {institutions.length === 0 && <tr><td className="p-3 text-white/50" colSpan={5}>No institutions yet. Add the ones you work with; the course-search catalog can fill this list later.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl p-4 glass-card">
        <h3 className="mb-3 text-base font-semibold">Agents</h3>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input className="glass-input rounded-full px-3 py-2" placeholder="Agent name" value={ag.name} onChange={(e) => setAg({ ...ag, name: e.target.value })} />
            <input className="glass-input rounded-full px-3 py-2" placeholder="Phone" value={ag.phone} onChange={(e) => setAg({ ...ag, phone: e.target.value })} />
            <input className="glass-input rounded-full px-3 py-2" placeholder="Email" value={ag.email} onChange={(e) => setAg({ ...ag, email: e.target.value })} />
          </div>
          <p className="text-xs text-white/60">Partner institutions this agent is attached to:</p>
          <div className="flex max-h-32 flex-wrap gap-3 overflow-auto">
            {partners.length === 0 && <span className="text-white/50">Mark an institution as partner first.</span>}
            {partners.map((p) => (
              <label key={p.id} className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={ag.institutionIds.includes(p.id)}
                  onChange={(e) => setAg({ ...ag, institutionIds: e.target.checked ? [...ag.institutionIds, p.id] : ag.institutionIds.filter((x) => x !== p.id) })} />{p.name}
              </label>))}
          </div>
          <div className="flex gap-2">
            <button className="min-h-[40px] rounded-full px-4 btn-primary" onClick={async () => {
              if (await post({ action: 'agent.save', ...ag }, ag.id ? 'Agent updated' : 'Agent added')) setAg({ name: '', phone: '', email: '', institutionIds: [] })
            }}>{ag.id ? 'Update agent' : 'Add agent'}</button>
            {ag.id && <button className="text-xs underline" onClick={() => setAg({ name: '', phone: '', email: '', institutionIds: [] })}>cancel edit</button>}
          </div>
        </div>
        <div className="mt-3 max-h-64 overflow-auto">
          <table className="w-full">
            <thead><tr className="text-left text-white/60"><th className="p-2">Agent</th><th className="p-2">Phone</th><th className="p-2">Institutions</th><th className="p-2" /></tr></thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-t border-white/10">
                  <td className="p-2">{a.name}</td><td className="p-2">{a.phone}</td>
                  <td className="p-2">{a.institution_ids.map((id) => institutions.find((i) => i.id === id)?.name).filter(Boolean).join(', ')}</td>
                  <td className="p-2"><button className="text-xs underline" onClick={() => setAg({ id: a.id, name: a.name, phone: a.phone ?? '', email: a.email ?? '', institutionIds: a.institution_ids })}>edit</button></td>
                </tr>))}
              {agents.length === 0 && <tr><td className="p-3 text-white/50" colSpan={4}>No agents yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
