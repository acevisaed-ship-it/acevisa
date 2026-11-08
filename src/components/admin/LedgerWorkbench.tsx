'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { QUERY_VIEWS, FILTER_OPS } from '@/lib/ledger/queryViews'
import { CaseDetailsDialog } from '@/components/admin/CaseDetailsDialog'

/**
 * One generic screen for every register, report and workflow action:
 * pick a dataset, narrow it with dropdown filters (different filters combine with "and", several values in one
 * dropdown combine with "or"), pick a date range, group/sum, export CSV, save the view, and run row actions.
 * All business rules run in the database (ledger_action); this component only calls it.
 */

type Row = Record<string, unknown>
type Facet = { value: string; count: number }
type Totals = { count: number; students: number; sums: Record<string, number>; truncated: boolean }
type Adv = { field: string; op: string; value: string }
type Config = {
  view: string; sel: Record<string, string[]>; dateField: string; preset: string; from: string; to: string
  groupBy: string; sumField: string; cols: string[]; filters: Adv[]
}
type Saved = { id: string; name: string; config: Partial<Config>; shared: boolean; mine: boolean; starter: boolean }
type RowAction = { label: string; action: string; map: Record<string, string>; ask?: { key: string; label: string; def?: string }[]; when?: (r: Row) => boolean; dialog?: 'case_details' }

const CASE_ACTIONS: RowAction[] = [
  { label: 'Sell voucher', action: 'voucher.sell', map: { dealId: 'deal_id' }, ask: [{ key: 'price', label: 'Price charged to client (PKR)' }, { key: 'cost', label: 'Cost paid to exam body (PKR)' }, { key: 'serial', label: 'Voucher serial' }, { key: 'validUntil', label: 'Valid until (YYYY-MM-DD)' }] },
  { label: 'Charge service', action: 'service.charge', map: { dealId: 'deal_id' }, ask: [{ key: 'amount', label: 'Amount (PKR)' }, { key: 'description', label: 'Service description' }] },
  { label: 'Share case', action: 'share.request', map: { dealId: 'deal_id' }, ask: [{ key: 'a', label: 'Counselor ID 1' }, { key: 'pa', label: 'Share % 1' }, { key: 'b', label: 'Counselor ID 2' }, { key: 'pb', label: 'Share % 2' }] },
  { label: 'Approve shares', action: 'share.approve', map: { dealId: 'deal_id' } },
  { label: 'Revoke clearance', action: 'clearance.revoke', map: { dealId: 'deal_id' }, when: (r) => r.clearance_status === 'cleared' },
  { label: 'Pin checklist', action: 'checklist.pin', map: { dealId: 'deal_id' } },
  { label: 'Set stage', action: 'stage.set', map: { dealId: 'deal_id' }, ask: [{ key: 'stageCode', label: 'Stage code (e.g. offer_letter)' }, { key: 'status', label: 'Status (pending/in_progress/done/blocked/waived)', def: 'done' }] },
  { label: 'Withdraw', action: 'case.withdraw', map: { dealId: 'deal_id' }, ask: [{ key: 'reason', label: 'Reason' }, { key: 'stageCode', label: 'Stage code it happened at' }] },
]

const ROW_ACTIONS: Record<string, RowAction[]> = {
  v_cases_wide: CASE_ACTIONS,
  v_cases_report: [{ label: 'Edit details', action: '', map: {}, dialog: 'case_details' }, ...CASE_ACTIONS],
  v_incentives_wide: [
    { label: 'Hold', action: 'incentive.hold', map: { incentiveId: 'incentive_id' }, ask: [{ key: 'reason', label: 'Reason' }, { key: 'taskRef', label: 'Task reference' }], when: (r) => r.status === 'active' },
    { label: 'Release', action: 'incentive.release', map: { incentiveId: 'incentive_id' }, when: (r) => r.status === 'held' },
    { label: 'Cancel held', action: 'incentive.release', map: { incentiveId: 'incentive_id' }, ask: [{ key: 'action', label: 'Type cancel to confirm', def: 'cancel' }], when: (r) => r.status === 'held' },
  ],
  v_vouchers_wide: [
    { label: 'Apply to case', action: 'voucher.apply', map: { voucherId: 'voucher_id', dealId: 'deal_id' }, when: (r) => r.status === 'issued' },
    { label: 'Extend', action: 'voucher.decide', map: { voucherId: 'voucher_id' }, ask: [{ key: 'newValidUntil', label: 'New valid until (YYYY-MM-DD)' }], when: (r) => r.status === 'needs_decision' },
    { label: 'Write off', action: 'voucher.decide', map: { voucherId: 'voucher_id' }, ask: [{ key: 'decision', label: 'Type write_off to confirm', def: 'write_off' }], when: (r) => r.status === 'needs_decision' },
  ],
  v_refunds_wide: [
    { label: 'Vendor refunded', action: 'refund.vendor_confirm', map: { refundId: 'refund_id' }, when: (r) => r.status === 'requested' && !r.vendor_refund_received },
    { label: 'Approve', action: 'refund.approve', map: { refundId: 'refund_id' }, when: (r) => r.status === 'requested' },
    { label: 'Pay', action: 'refund.pay', map: { refundId: 'refund_id' }, when: (r) => r.status === 'approved' },
    { label: 'Reject', action: 'refund.reject', map: { refundId: 'refund_id' }, ask: [{ key: 'reason', label: 'Reason' }], when: (r) => r.status === 'requested' || r.status === 'approved' },
  ],
  v_language_wide: [
    { label: 'Update', action: 'language.update', map: { testId: 'test_id' }, ask: [{ key: 'status', label: 'Status (registered/scheduled/completed/cancelled/no_show)' }, { key: 'result', label: 'Result' }] },
    { label: 'Add session', action: 'session.create', map: { testId: 'test_id' }, ask: [{ key: 'instructorId', label: 'Instructor staff ID' }, { key: 'sessionType', label: 'LRW or Speaking' }, { key: 'scheduledAt', label: 'When (YYYY-MM-DD HH:MM)' }, { key: 'room', label: 'Room' }] },
  ],
  v_payroll_wide: [
    { label: 'Approve run', action: 'payroll.approve', map: { runId: 'run_id' }, when: (r) => r.run_status === 'draft' },
    { label: 'Mark run paid', action: 'payroll.pay', map: { runId: 'run_id' }, when: (r) => r.run_status === 'approved' },
  ],
}

const DEFAULT_COLS: Record<string, string[]> = {
  v_cases_report: ['client_name', 'counselor_name', 'agent_name', 'university', 'country', 'applied_at', 'current_stage', 'payment_status', 'received', 'remaining', 'profit_after_incentives'],
  v_payments_wide: ['paid_at', 'receipt_no', 'client_name', 'amount', 'payment_kind', 'country', 'university', 'counselor_name'],
  v_services_wide: ['service_date', 'client_name', 'service_type', 'sub_type', 'country', 'institution', 'agent_name', 'stage', 'status', 'amount'],
  v_stage_history: ['client_name', 'stage', 'stage_status', 'entered_at', 'counselor_name'],
  v_cases_wide: ['client_name', 'counselor_name', 'product_name', 'case_status', 'current_stage', 'received', 'gross', 'incentives_pending', 'incentives_active', 'clearance_status'],
  v_incentives_wide: ['client_name', 'counselor_name', 'milestone', 'gross_base', 'rate_snapshot', 'amount', 'status', 'pay_date'],
  v_vouchers_wide: ['client_name', 'serial_no', 'face_value', 'status', 'valid_until', 'days_to_expiry', 'receipt_no'],
  v_refunds_wide: ['client_name', 'receipt_no', 'amount', 'status', 'vendor_refund_received', 'reason'],
  v_language_wide: ['client_name', 'exam_org', 'test_type', 'test_date', 'status', 'result', 'session_type', 'scheduled_at', 'instructor_name'],
  v_payroll_wide: ['period', 'counselor_name', 'basic', 'allowances', 'deductions', 'incentives_earned', 'incentives_held', 'adjustments', 'net', 'run_status'],
  v_ledger: ['occurred_at', 'entry_type', 'signed_amount', 'ref', 'method'],
  v_clients_wide: ['client_code', 'name', 'phone', 'email', 'city', 'counselor_name', 'status'],
}

// id/status columns the row actions need even when the user hides them
const HIDDEN: Record<string, string[]> = {
  v_cases_wide: ['deal_id', 'clearance_status'],
  v_cases_report: ['deal_id', 'clearance_status', 'client_name', 'country', 'university', 'agent_name', 'source_type', 'institution_other', 'applied_at'],
  v_incentives_wide: ['incentive_id', 'status'],
  v_vouchers_wide: ['voucher_id', 'deal_id', 'status'],
  v_refunds_wide: ['refund_id', 'status', 'vendor_refund_received'],
  v_language_wide: ['test_id'],
  v_payroll_wide: ['run_id', 'item_id', 'run_status'],
}

// Dropdown filters (each shows its options with counts) and the date columns a range can apply to
const FACETS: Record<string, { fields: string[]; dates: string[] }> = {
  v_cases_report: { fields: ['country', 'university', 'current_stage', 'counselor_name', 'agent_name', 'service_type', 'payment_status', 'case_status'], dates: ['applied_at', 'created_at'] },
  v_payments_wide: { fields: ['country', 'university', 'payment_kind', 'service_type', 'counselor_name', 'agent_name', 'method', 'status'], dates: ['paid_at'] },
  v_services_wide: { fields: ['service_type', 'country', 'institution', 'stage', 'counselor_name', 'agent_name', 'status'], dates: ['service_date'] },
  v_stage_history: { fields: ['stage', 'stage_status', 'counselor_name'], dates: ['entered_at'] },
  v_cases_wide: { fields: ['country', 'university', 'current_stage', 'counselor_name', 'case_status'], dates: ['created_at'] },
  v_incentives_wide: { fields: ['counselor_name', 'milestone', 'status', 'product_name'], dates: ['created_at'] },
  v_vouchers_wide: { fields: ['status', 'product_name'], dates: ['issued_at'] },
  v_refunds_wide: { fields: ['status', 'method'], dates: ['requested_at'] },
  v_language_wide: { fields: ['exam_org', 'test_type', 'status', 'instructor_name'], dates: ['test_date'] },
  v_ledger: { fields: ['entry_type', 'method'], dates: ['occurred_at'] },
}

const TOTAL_FIELDS: Record<string, string[]> = {
  v_cases_report: ['invoiced', 'received', 'remaining', 'profit_after_incentives'],
  v_cases_wide: ['received', 'gross'],
  v_payments_wide: ['amount'], v_services_wide: ['amount'], v_incentives_wide: ['amount'], v_refunds_wide: ['amount'],
  v_vouchers_wide: ['face_value'], v_payroll_wide: ['net'], v_ledger: ['signed_amount'],
}

const DATE_LABEL: Record<string, string> = {
  applied_at: 'Application date', created_at: 'Created date', paid_at: 'Payment date', service_date: 'Service date',
  entered_at: 'Stage entered', issued_at: 'Issued date', requested_at: 'Requested date', test_date: 'Test date', occurred_at: 'Date',
}
const TAB_ORDER = ['v_cases_report', 'v_payments_wide', 'v_services_wide', 'v_stage_history', 'v_incentives_wide', 'v_vouchers_wide',
  'v_refunds_wide', 'v_language_wide', 'v_payroll_wide', 'v_ledger', 'v_clients_wide', 'v_cases_wide']
const PRESETS: { key: string; label: string }[] = [
  { key: 'all', label: 'All time' }, { key: 'this_month', label: 'This month' }, { key: 'last_month', label: 'Last month' },
  { key: 'last_30', label: 'Last 30 days' }, { key: 'this_year', label: 'This year' }, { key: 'custom', label: 'Custom' },
]

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const nextDay = (s: string) => { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + 1); return iso(d) }
function presetRange(p: string): { from: string; to: string } {
  const now = new Date()
  if (p === 'this_month') return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) }
  if (p === 'last_month') return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) }
  if (p === 'last_30') { const d = new Date(now); d.setDate(d.getDate() - 29); return { from: iso(d), to: iso(now) } }
  if (p === 'this_year') return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) }
  return { from: '', to: '' }
}

const pretty = (s: string) => s.replace(/_/g, ' ')
const fmt = (v: unknown) => (v == null ? '' : typeof v === 'number' ? v.toLocaleString('en-PK') : typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v).slice(0, 60))
const money = (n: number) => Math.round(n).toLocaleString('en-PK')

function MultiSelect({ label, options, selected, onChange }: {
  label: string; options: Facet[]; selected: string[]; onChange: (v: string[]) => void
}) {
  const merged = [...options, ...selected.filter((s) => !options.some((o) => o.value === s)).map((value) => ({ value, count: 0 }))]
  return (
    <details className="relative">
      <summary className="glass-input cursor-pointer list-none whitespace-nowrap rounded-full px-3 py-2 text-sm text-white">
        {label}{selected.length ? ` (${selected.length})` : ''} ▾
      </summary>
      <div className="absolute z-20 mt-1 max-h-64 w-64 overflow-auto rounded-xl glass-card p-2 text-sm text-white">
        {merged.length === 0 && <p className="p-2 text-white/50">No values</p>}
        {merged.map((o) => (
          <label key={o.value} className="flex items-center justify-between gap-2 p-1">
            <span className="flex items-center gap-2">
              <input type="checkbox" checked={selected.includes(o.value)}
                onChange={(e) => onChange(e.target.checked ? [...selected, o.value] : selected.filter((x) => x !== o.value))} />
              {pretty(o.value)}
            </span>
            <span className="text-white/50">{o.count}</span>
          </label>))}
      </div>
    </details>
  )
}

// Registers an accountant never sees (salaries and commissions) and the only row actions they may run
const ACCOUNTANT_HIDDEN_VIEWS = new Set(['v_payroll_wide', 'v_payroll_lines_wide', 'v_incentives_wide'])
const ACCOUNTANT_ACTIONS = new Set(['voucher.sell', 'voucher.apply', 'voucher.decide', 'refund.request', 'refund.vendor_confirm', 'refund.approve', 'refund.reject', 'refund.pay', 'service.charge', 'language.update'])

export function LedgerWorkbench({ restricted = false }: { restricted?: boolean } = {}) {
  const [view, setView] = useState('v_cases_report')
  const [cols, setCols] = useState<string[]>(DEFAULT_COLS.v_cases_report)
  const [sel, setSel] = useState<Record<string, string[]>>({})
  const [dateField, setDateField] = useState(FACETS.v_cases_report.dates[0])
  const [preset, setPreset] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [adv, setAdv] = useState<Adv[]>([])
  const [groupBy, setGroupBy] = useState('')
  const [sumField, setSumField] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [facets, setFacets] = useState<Record<string, Facet[]>>({})
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [saved, setSaved] = useState<Saved[]>([])
  const [savedId, setSavedId] = useState('')
  const [editRow, setEditRow] = useState<Row | null>(null)
  const def = QUERY_VIEWS[view]
  const facetCfg = FACETS[view]
  const rowLimit = groupBy ? 20000 : 1000

  const range = preset === 'custom' ? { from, to } : presetRange(preset)

  const filters = useMemo(() => {
    const f: { field: string; op: string; value: string | string[] }[] = []
    for (const [field, vals] of Object.entries(sel)) if (vals.length) f.push({ field, op: 'in', value: vals })
    const r = preset === 'custom' ? { from, to } : presetRange(preset)
    if (dateField && r.from) f.push({ field: dateField, op: 'gte', value: r.from })
    if (dateField && r.to) f.push({ field: dateField, op: 'lt', value: nextDay(r.to) })
    for (const a of adv) if (a.value !== '') f.push(a)
    return f
  }, [sel, dateField, preset, from, to, adv])

  const body = useMemo(() => ({
    view, fields: [...new Set([...cols, ...(HIDDEN[view] ?? [])])], filters,
    groupBy: groupBy ? [groupBy] : [], agg: groupBy ? [{ fn: 'count' as const }, ...(sumField ? [{ fn: 'sum' as const, field: sumField }] : [])] : [],
    limit: rowLimit,
  }), [view, cols, filters, groupBy, sumField, rowLimit])

  const run = useCallback(async () => {
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, facets: FACETS[view]?.fields ?? [], totals: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Query failed')
      setRows(json.rows ?? []); setColumns(json.columns ?? []); setFacets(json.facets ?? {}); setTotals(json.totals ?? null)
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Query failed') } finally { setLoading(false) }
  }, [body, view])

  useEffect(() => { void run() }, [run])

  const loadSaved = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/saved-views')
      if (res.ok) setSaved(((await res.json()).views ?? []) as Saved[])
    } catch { /* saved views are optional */ }
  }, [])
  useEffect(() => { void loadSaved() }, [loadSaved])

  function resetFilters(v = view) {
    setSel({}); setAdv([]); setPreset('all'); setFrom(''); setTo(''); setGroupBy(''); setSumField('')
    setDateField(FACETS[v]?.dates[0] ?? ''); setSavedId('')
  }
  function changeView(v: string) {
    setView(v); setCols(DEFAULT_COLS[v] ?? QUERY_VIEWS[v].columns.slice(0, 8)); resetFilters(v)
  }

  function applySaved(id: string) {
    setSavedId(id)
    const s = saved.find((x) => x.id === id)
    if (!s || !s.config.view || !QUERY_VIEWS[s.config.view]) return
    const c = s.config
    const v = c.view as string
    setView(v); setCols(c.cols?.length ? c.cols : (DEFAULT_COLS[v] ?? QUERY_VIEWS[v].columns.slice(0, 8)))
    setSel(c.sel ?? {}); setAdv(c.filters ?? []); setPreset(c.preset ?? 'all'); setFrom(c.from ?? ''); setTo(c.to ?? '')
    setDateField(c.dateField ?? FACETS[v]?.dates[0] ?? ''); setGroupBy(c.groupBy ?? ''); setSumField(c.sumField ?? '')
  }

  async function saveView() {
    const name = window.prompt('Name for this view')
    if (!name) return
    const config: Config = { view, sel, dateField, preset, from, to, groupBy, sumField, cols, filters: adv }
    const shared = window.confirm('Share this view with other admins? (OK = share, Cancel = only me)')
    const res = await fetch('/api/admin/saved-views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, config, shared }) })
    const json = await res.json()
    setMsg(res.ok ? `Saved "${name}"` : (json.error || 'Could not save'))
    if (res.ok) { await loadSaved(); setSavedId(json.id) }
  }

  async function deleteView() {
    const s = saved.find((x) => x.id === savedId)
    if (!s || !s.mine || !window.confirm(`Delete saved view "${s.name}"?`)) return
    const res = await fetch(`/api/admin/saved-views?id=${s.id}`, { method: 'DELETE' })
    setMsg(res.ok ? 'View deleted' : 'Could not delete')
    if (res.ok) { setSavedId(''); await loadSaved() }
  }

  async function exportCsv() {
    const res = await fetch('/api/admin/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, export: 'csv', limit: 20000 }) })
    if (!res.ok) { setMsg('Export failed'); return }
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a'); a.href = url; a.download = `${view}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  async function act(a: RowAction, r: Row) {
    if (a.dialog === 'case_details') { setEditRow(r); return }
    const params: Record<string, unknown> = {}
    for (const [k, col] of Object.entries(a.map)) params[k] = r[col]
    for (const q of a.ask ?? []) {
      const v = window.prompt(q.label, q.def ?? '')
      if (v === null) return
      params[q.key] = v
    }
    if (a.action === 'share.request') {
      params.shares = [{ counselorId: params.a, pct: Number(params.pa) }, { counselorId: params.b, pct: Number(params.pb) }]
    }
    const res = await fetch('/api/admin/ledger/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: a.action, params }) })
    const json = await res.json()
    setMsg(res.ok ? `${a.label}: done` : (json.error || 'Failed'))
    if (res.ok) void run()
  }

  async function payrollBuild() {
    const period = window.prompt('Payroll month (YYYY-MM-01)', new Date().toISOString().slice(0, 8) + '01')
    if (!period) return
    const res = await fetch('/api/admin/ledger/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'payroll.build', params: { period } }) })
    const json = await res.json()
    setMsg(res.ok ? 'Payroll built (draft)' : (json.error || 'Failed'))
    if (res.ok) void run()
  }

  async function slip(r: Row) {
    const res = await fetch('/api/admin/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ view: 'v_payroll_lines_wide', filters: [{ field: 'item_id', op: 'eq', value: String(r.item_id) }], sort: { field: 'order_no' } }) })
    const json = await res.json()
    window.alert((json.rows as Row[] ?? []).map((l) => `${String(l.label).padEnd(34)} ${Number(l.amount).toLocaleString('en-PK')}`).join('\n') + `\n\nNET ${Number(r.net).toLocaleString('en-PK')}`)
  }

  const actions = (ROW_ACTIONS[view] ?? []).filter((a) => !restricted || a.dialog === 'case_details' || ACCOUNTANT_ACTIONS.has(a.action))
  const shown = groupBy ? columns : columns.filter((c) => cols.includes(c))
  const chips = Object.entries(sel).flatMap(([field, vals]) => vals.map((v) => ({ field, v })))
  const totalKeys = (TOTAL_FIELDS[view] ?? []).filter((k) => totals && k in totals.sums)
  const activeCount = chips.length + adv.filter((a) => a.value !== '').length + (preset !== 'all' ? 1 : 0)

  return (
    <div className="flex flex-col gap-4">
      {editRow && <CaseDetailsDialog row={editRow} onClose={() => setEditRow(null)} onSaved={() => { setMsg('Case details saved'); void run() }} />}
      <div className="flex flex-wrap items-center gap-2">
        {TAB_ORDER.filter((k) => QUERY_VIEWS[k] && !(restricted && ACCOUNTANT_HIDDEN_VIEWS.has(k))).map((k) => (
          <button key={k} onClick={() => changeView(k)}
            className={`min-h-[40px] rounded-full px-4 text-sm ${view === k ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
            {k === 'v_cases_wide' ? 'Cases (simple)' : QUERY_VIEWS[k].label}</button>))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-white">
        <select className="glass-input rounded-full px-3 py-2" value={savedId} onChange={(e) => applySaved(e.target.value)}>
          <option value="">Saved views…</option>
          {saved.map((s) => <option key={s.id} value={s.id}>{s.name}{s.starter ? ' ★' : s.shared ? ' (shared)' : ''}</option>)}
        </select>
        <button onClick={() => void saveView()} className="min-h-[40px] rounded-full px-4 glass-input">Save this view</button>
        {saved.find((s) => s.id === savedId)?.mine && (
          <button onClick={() => void deleteView()} className="min-h-[40px] rounded-full px-4 glass-input text-red-300">Delete view</button>)}
      </div>

      {facetCfg && (
        <div className="rounded-2xl p-4 glass-card text-sm text-white">
          <div className="flex flex-wrap items-center gap-2">
            {facetCfg.fields.map((f) => (
              <MultiSelect key={f} label={pretty(f)} options={facets[f] ?? []} selected={sel[f] ?? []}
                onChange={(vals) => setSel({ ...sel, [f]: vals })} />))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {facetCfg.dates.length > 1 ? (
              <select className="glass-input rounded-full px-3 py-2" value={dateField} onChange={(e) => setDateField(e.target.value)}>
                {facetCfg.dates.map((d) => <option key={d} value={d}>Date applies to: {DATE_LABEL[d] ?? pretty(d)}</option>)}</select>
            ) : <span className="text-white/60">{DATE_LABEL[facetCfg.dates[0]] ?? pretty(facetCfg.dates[0])}:</span>}
            {PRESETS.map((p) => (
              <button key={p.key} onClick={() => setPreset(p.key)}
                className={`min-h-[36px] rounded-full px-3 ${preset === p.key ? 'tab-btn-active' : 'tab-btn-inactive'}`}>{p.label}</button>))}
            {preset === 'custom' && (
              <>
                <input type="date" className="glass-input rounded-full px-3 py-1" value={from} onChange={(e) => setFrom(e.target.value)} />
                <span className="text-white/60">to</span>
                <input type="date" className="glass-input rounded-full px-3 py-1" value={to} onChange={(e) => setTo(e.target.value)} />
              </>)}
            {preset !== 'custom' && range.from && <span className="text-xs text-white/50">{range.from} → {range.to}</span>}
          </div>
          {(chips.length > 0 || activeCount > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {chips.map(({ field, v }) => (
                <button key={`${field}:${v}`} onClick={() => setSel({ ...sel, [field]: (sel[field] ?? []).filter((x) => x !== v) })}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs">{pretty(field)}: {pretty(v)} ✕</button>))}
              <button onClick={() => resetFilters()} className="text-xs text-white/70 underline">Clear all</button>
            </div>)}
        </div>
      )}

      {totals && (
        <div className="flex flex-wrap gap-3 text-white">
          <div className="rounded-xl px-4 py-2 glass-card"><p className="text-xs text-white/50">Rows</p><p className="text-lg font-semibold">{totals.count.toLocaleString('en-PK')}</p></div>
          {allowedClient(view) && <div className="rounded-xl px-4 py-2 glass-card"><p className="text-xs text-white/50">Students</p><p className="text-lg font-semibold">{totals.students.toLocaleString('en-PK')}</p></div>}
          {totalKeys.map((k) => (
            <div key={k} className="rounded-xl px-4 py-2 glass-card"><p className="text-xs text-white/50">Total {pretty(k)}</p><p className="text-lg font-semibold">{money(totals.sums[k])}</p></div>))}
          {view === 'v_cases_report' && totals.students > 0 && (
            <div className="rounded-xl px-4 py-2 glass-card"><p className="text-xs text-white/50">Avg received per student</p><p className="text-lg font-semibold">{money((totals.sums.received ?? 0) / totals.students)}</p></div>)}
          {totals.truncated && <p className="self-center text-xs text-amber-300">Totals cover the first 20,000 rows only. Narrow the filters.</p>}
        </div>
      )}

      <details className="rounded-2xl p-4 glass-card text-sm text-white">
        <summary className="cursor-pointer text-white/80">Columns, custom filters, grouping</summary>
        <div className="mt-3 flex flex-wrap gap-3">
          {def.columns.map((c) => (
            <label key={c} className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={cols.includes(c)} onChange={(e) => setCols(e.target.checked ? [...cols, c] : cols.filter((x) => x !== c))} />{pretty(c)}
            </label>))}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {adv.map((f, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <select className="glass-input rounded-full px-3 py-1" value={f.field} onChange={(e) => setAdv(adv.map((x, j) => j === i ? { ...x, field: e.target.value } : x))}>
                {def.columns.map((c) => <option key={c} value={c}>{pretty(c)}</option>)}</select>
              <select className="glass-input rounded-full px-3 py-1" value={f.op} onChange={(e) => setAdv(adv.map((x, j) => j === i ? { ...x, op: e.target.value } : x))}>
                {FILTER_OPS.map((o) => <option key={o} value={o}>{o}</option>)}</select>
              <input className="glass-input rounded-full px-3 py-1" value={f.value} placeholder="value" onChange={(e) => setAdv(adv.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
              <button onClick={() => setAdv(adv.filter((_, j) => j !== i))} className="text-xs text-white/60">remove</button>
            </div>))}
          <button onClick={() => setAdv([...adv, { field: def.columns[0], op: 'eq', value: '' }])} className="w-fit text-xs text-white/80 underline">+ add custom filter</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <select className="glass-input rounded-full px-3 py-1" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="">No grouping</option>{def.columns.map((c) => <option key={c} value={c}>group by {pretty(c)}</option>)}</select>
          {groupBy && (
            <select className="glass-input rounded-full px-3 py-1" value={sumField} onChange={(e) => setSumField(e.target.value)}>
              <option value="">count only</option>{def.numeric.map((c) => <option key={c} value={c}>sum of {pretty(c)}</option>)}</select>)}
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => void run()} className="min-h-[40px] rounded-full px-4 text-sm btn-primary">Refresh</button>
        <button onClick={() => void exportCsv()} className="min-h-[40px] rounded-full px-4 text-sm glass-input text-white">Export CSV</button>
        {view === 'v_payroll_wide' && <button onClick={() => void payrollBuild()} className="min-h-[40px] rounded-full px-4 text-sm btn-primary">Build payroll</button>}
        <span className="text-sm text-white/60">
          {loading ? 'Loading…' : `${rows.length} ${groupBy ? 'groups' : 'rows'}${!groupBy && rows.length >= rowLimit ? ` (showing first ${rowLimit}; totals above cover everything)` : ''}`}
        </span>
        {msg && <span className="text-sm text-amber-300">{msg}</span>}
      </div>

      <div className="overflow-x-auto rounded-2xl glass-card">
        <table className="w-full text-sm text-white">
          <thead><tr className="text-left text-white/60">{shown.map((c) => <th key={c} className="p-3 whitespace-nowrap">{pretty(c)}</th>)}<th className="p-3" /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-white/10">
                {shown.map((c) => <td key={c} className="p-3 whitespace-nowrap">{fmt(r[c])}</td>)}
                <td className="p-3 whitespace-nowrap">
                  {!groupBy && view === 'v_payroll_wide' && <button onClick={() => void slip(r)} className="mr-2 text-xs underline">Payslip</button>}
                  {!groupBy && actions.filter((a) => !a.when || a.when(r)).map((a) => (
                    <button key={a.label} onClick={() => void act(a, r)} className="mr-2 text-xs underline">{a.label}</button>))}
                </td>
              </tr>))}
            {!loading && rows.length === 0 && (
              <tr><td className="p-4 text-white/50" colSpan={shown.length + 1}>No rows match these filters.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function allowedClient(view: string) {
  return QUERY_VIEWS[view]?.columns.includes('client_id') ?? false
}
