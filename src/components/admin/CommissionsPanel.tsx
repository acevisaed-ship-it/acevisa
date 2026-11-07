'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

type Line = {
  milestoneType: string; occurredAt: string; counselorId: string; counselorName: string
  milestonePct: number; sharePct: number; base: number; rate: number; amount: number
  state: string; payDate: string | null
}
type CaseRow = {
  dealId: string; clientName: string; counselorId: string; counselorName: string
  productName: string | null; serviceType: string
  received: number; refunded: number; expenses: number; gross: number
  clearance: string; clearedAt: string | null; lines: Line[]; total: number; warnings: string[]
}
type ByCounselor = { counselorId: string; name: string; projected: number; active: number; held: number; paid: number }

const MS_LABEL: Record<string, string> = {
  offer_letter: 'Offer letter', loa_cas: 'LOA / CAS', visa_filed: 'Visa filing', visa_granted: 'Visa granted', other: 'Other',
}
const STATE_LABEL: Record<string, string> = {
  projected: 'Not yet earned', pending_clearance: 'Pending clearance', active: 'Earned (payable)', held: 'Held', paid: 'Paid',
}
const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`

export function CommissionsPanel({ counselors }: { counselors: { id: string; name: string }[] }) {
  const [cases, setCases] = useState<CaseRow[]>([])
  const [by, setBy] = useState<ByCounselor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [counselor, setCounselor] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/admin/commissions${counselor ? `?counselorId=${counselor}` : ''}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setCases(json.cases ?? []); setBy(json.byCounselor ?? [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [counselor])

  useEffect(() => { void load() }, [load])

  async function clearCase(c: CaseRow) {
    if (!window.confirm(`Clear this case for ${c.clientName}? Commissions of ${pkr(c.total)} become payable in the next payroll.`)) return
    setBusy(c.dealId)
    try {
      const res = await fetch('/api/admin/clearance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId: c.dealId }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to clear')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to clear') }
    finally { setBusy(null) }
  }

  const totals = useMemo(() => by.reduce((a, r) => ({
    projected: a.projected + r.projected, active: a.active + r.active, held: a.held + r.held, paid: a.paid + r.paid,
  }), { projected: 0, active: 0, held: 0, paid: 0 }), [by])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Commissions by case</h2>
          <p className="text-sm text-white/60">
            Commission = case gross (payments − refunds − case expenses) × milestone share × counselor rate. Only cleared cases become payable.
          </p>
        </div>
        <select value={counselor} onChange={(e) => setCounselor(e.target.value)}
          className="min-h-[44px] rounded-full px-4 py-2 text-sm glass-input">
          <option value="">All counselors</option>
          {counselors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Not yet earned', totals.projected], ['Earned (payable)', totals.active], ['Held', totals.held], ['Paid', totals.paid]].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl p-4 glass-card">
            <p className="text-xs text-white/60">{l as string}</p>
            <p className="mt-1 text-lg font-semibold text-white">{pkr(v as number)}</p>
          </div>
        ))}
      </div>

      {by.length > 0 && (
        <div className="overflow-x-auto rounded-2xl glass-card">
          <table className="w-full text-sm text-white">
            <thead><tr className="text-left text-white/60">
              <th className="p-3">Counselor</th><th className="p-3">Not yet earned</th><th className="p-3">Earned</th><th className="p-3">Held</th><th className="p-3">Paid</th>
            </tr></thead>
            <tbody>{by.map((r) => (
              <tr key={r.counselorId} className="border-t border-white/10">
                <td className="p-3">{r.name}</td><td className="p-3">{pkr(r.projected)}</td><td className="p-3">{pkr(r.active)}</td><td className="p-3">{pkr(r.held)}</td><td className="p-3">{pkr(r.paid)}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}
      {loading ? <p className="text-sm text-white/60">Loading…</p> : cases.length === 0 ? (
        <p className="text-sm text-white/60">No cases with payments or milestones yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl glass-card">
          <table className="w-full text-sm text-white">
            <thead><tr className="text-left text-white/60">
              <th className="p-3">Client</th><th className="p-3">Counselor</th><th className="p-3">Received</th>
              <th className="p-3">Refunds</th><th className="p-3">Expenses</th><th className="p-3">Gross</th>
              <th className="p-3">Commission</th><th className="p-3">Status</th><th className="p-3" />
            </tr></thead>
            <tbody>
              {cases.map((c) => (
                <Fragment key={c.dealId}>
                  <tr className="cursor-pointer border-t border-white/10 hover:bg-white/5" onClick={() => setOpen(open === c.dealId ? null : c.dealId)}>
                    <td className="p-3">{c.clientName}<div className="text-xs text-white/50">{c.productName ?? c.serviceType}</div></td>
                    <td className="p-3">{c.counselorName}</td>
                    <td className="p-3">{pkr(c.received)}</td><td className="p-3">{pkr(c.refunded)}</td>
                    <td className="p-3">{pkr(c.expenses)}</td><td className="p-3">{pkr(c.gross)}</td>
                    <td className="p-3 font-medium">{pkr(c.total)}</td>
                    <td className="p-3">{c.clearance === 'cleared' ? 'Cleared' : c.lines.length ? 'Awaiting clearance' : 'No milestones yet'}</td>
                    <td className="p-3">
                      {c.clearance !== 'cleared' && c.lines.length > 0 && (
                        <button disabled={busy === c.dealId} onClick={(e) => { e.stopPropagation(); void clearCase(c) }}
                          className="min-h-[36px] rounded-full px-4 text-xs font-medium btn-primary">
                          {busy === c.dealId ? 'Clearing…' : 'Clear case'}
                        </button>)}
                    </td>
                  </tr>
                  {open === c.dealId && (
                    <tr className="border-t border-white/10 bg-white/5"><td colSpan={9} className="p-4">
                      {c.warnings.length > 0 && <ul className="mb-3 list-disc pl-5 text-xs text-amber-300">{c.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
                      {c.lines.length === 0 ? <p className="text-xs text-white/60">Record milestones (offer letter, LOA/CAS, visa filing, visa granted) to see the commission breakdown.</p> : (
                        <table className="w-full text-xs">
                          <thead><tr className="text-left text-white/60"><th className="py-1">Milestone</th><th>Held by</th><th>Base (gross × share)</th><th>Rate</th><th>Commission</th><th>State</th><th>Pay date</th></tr></thead>
                          <tbody>{c.lines.map((l) => (
                            <tr key={l.milestoneType + l.counselorId} className="border-t border-white/10">
                              <td className="py-1">{MS_LABEL[l.milestoneType] ?? l.milestoneType} ({l.milestonePct}%)</td>
                              <td>{l.counselorName}{l.sharePct < 100 ? ` (${l.sharePct}%)` : ''}</td>
                              <td>{pkr(l.base)}</td><td>{l.rate}%</td><td>{pkr(l.amount)}</td>
                              <td>{STATE_LABEL[l.state] ?? l.state}</td><td>{l.payDate ?? '—'}</td>
                            </tr>))}</tbody>
                        </table>)}
                    </td></tr>)}
                </Fragment>))}
            </tbody>
          </table>
        </div>)}
    </div>
  )
}
