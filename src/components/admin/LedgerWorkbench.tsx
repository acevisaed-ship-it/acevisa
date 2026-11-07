'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { QUERY_VIEWS, FILTER_OPS } from '@/lib/ledger/queryViews'

/**
 * One generic screen for every register, report and workflow action:
 * pick a view, pick columns, add filters, group/sum, export CSV, and run row actions.
 * All business rules run in the database (ledger_action); this component only calls it.
 */

type Row = Record<string, unknown>
type RowAction = { label: string; action: string; map: Record<string, string>; ask?: { key: string; label: string; def?: string }[]; when?: (r: Row) => boolean }

const ROW_ACTIONS: Record<string, RowAction[]> = {
  v_cases_wide: [
    { label: 'Sell voucher', action: 'voucher.sell', map: { dealId: 'deal_id' }, ask: [{ key: 'price', label: 'Price charged to client (PKR)' }, { key: 'cost', label: 'Cost paid to exam body (PKR)' }, { key: 'serial', label: 'Voucher serial' }, { key: 'validUntil', label: 'Valid until (YYYY-MM-DD)' }] },
    { label: 'Charge service', action: 'service.charge', map: { dealId: 'deal_id' }, ask: [{ key: 'amount', label: 'Amount (PKR)' }, { key: 'description', label: 'Service description' }] },
    { label: 'Share case', action: 'share.request', map: { dealId: 'deal_id' }, ask: [{ key: 'a', label: 'Counselor ID 1' }, { key: 'pa', label: 'Share % 1' }, { key: 'b', label: 'Counselor ID 2' }, { key: 'pb', label: 'Share % 2' }] },
    { label: 'Approve shares', action: 'share.approve', map: { dealId: 'deal_id' } },
    { label: 'Revoke clearance', action: 'clearance.revoke', map: { dealId: 'deal_id' }, when: (r) => r.clearance_status === 'cleared' },
    { label: 'Pin checklist', action: 'checklist.pin', map: { dealId: 'deal_id' } },
    { label: 'Set stage', action: 'stage.set', map: { dealId: 'deal_id' }, ask: [{ key: 'stageCode', label: 'Stage code (e.g. offer_letter)' }, { key: 'status', label: 'Status (pending/in_progress/done/blocked/waived)', def: 'done' }] },
    { label: 'Withdraw', action: 'case.withdraw', map: { dealId: 'deal_id' }, ask: [{ key: 'reason', label: 'Reason' }, { key: 'stageCode', label: 'Stage code it happened at' }] },
  ],
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
  v_incentives_wide: ['incentive_id', 'status'],
  v_vouchers_wide: ['voucher_id', 'deal_id', 'status'],
  v_refunds_wide: ['refund_id', 'status', 'vendor_refund_received'],
  v_language_wide: ['test_id'],
  v_payroll_wide: ['run_id', 'item_id', 'run_status'],
}

const pretty = (s: string) => s.replace(/_/g, ' ')
const fmt = (v: unknown) => (v == null ? '' : typeof v === 'number' ? v.toLocaleString('en-PK') : typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v).slice(0, 60))

export function LedgerWorkbench() {
  const [view, setView] = useState('v_cases_wide')
  const [cols, setCols] = useState<string[]>(DEFAULT_COLS.v_cases_wide)
  const [filters, setFilters] = useState<{ field: string; op: string; value: string }[]>([])
  const [groupBy, setGroupBy] = useState('')
  const [sumField, setSumField] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const def = QUERY_VIEWS[view]

  const body = useMemo(() => ({
    view, fields: [...new Set([...cols, ...(HIDDEN[view] ?? [])])], filters: filters.filter((f) => f.value !== ''),
    groupBy: groupBy ? [groupBy] : [], agg: groupBy ? [{ fn: 'count' as const }, ...(sumField ? [{ fn: 'sum' as const, field: sumField }] : [])] : [],
    limit: 1000,
  }), [view, cols, filters, groupBy, sumField])

  const run = useCallback(async () => {
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/admin/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Query failed')
      setRows(json.rows ?? []); setColumns(json.columns ?? [])
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Query failed') } finally { setLoading(false) }
  }, [body])

  useEffect(() => { void run() }, [run])

  function changeView(v: string) {
    setView(v); setCols(DEFAULT_COLS[v] ?? QUERY_VIEWS[v].columns.slice(0, 8)); setFilters([]); setGroupBy(''); setSumField('')
  }

  async function exportCsv() {
    const res = await fetch('/api/admin/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, export: 'csv', limit: 20000 }) })
    if (!res.ok) { setMsg('Export failed'); return }
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a'); a.href = url; a.download = `${view}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  async function act(a: RowAction, r: Row) {
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

  const actions = ROW_ACTIONS[view] ?? []
  const shown = groupBy ? columns : columns.filter((c) => cols.includes(c))
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(QUERY_VIEWS).filter(([k]) => k !== 'v_payroll_lines_wide').map(([k, v]) => (
          <button key={k} onClick={() => changeView(k)}
            className={`min-h-[40px] rounded-full px-4 text-sm ${view === k ? 'tab-btn-active' : 'tab-btn-inactive'}`}>{v.label}</button>))}
      </div>

      <details className="rounded-2xl p-4 glass-card text-sm text-white">
        <summary className="cursor-pointer text-white/80">Columns, filters, grouping</summary>
        <div className="mt-3 flex flex-wrap gap-3">
          {def.columns.map((c) => (
            <label key={c} className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={cols.includes(c)} onChange={(e) => setCols(e.target.checked ? [...cols, c] : cols.filter((x) => x !== c))} />{pretty(c)}
            </label>))}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {filters.map((f, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <select className="glass-input rounded-full px-3 py-1" value={f.field} onChange={(e) => setFilters(filters.map((x, j) => j === i ? { ...x, field: e.target.value } : x))}>
                {def.columns.map((c) => <option key={c} value={c}>{pretty(c)}</option>)}</select>
              <select className="glass-input rounded-full px-3 py-1" value={f.op} onChange={(e) => setFilters(filters.map((x, j) => j === i ? { ...x, op: e.target.value } : x))}>
                {FILTER_OPS.map((o) => <option key={o} value={o}>{o}</option>)}</select>
              <input className="glass-input rounded-full px-3 py-1" value={f.value} placeholder="value" onChange={(e) => setFilters(filters.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
              <button onClick={() => setFilters(filters.filter((_, j) => j !== i))} className="text-xs text-white/60">remove</button>
            </div>))}
          <button onClick={() => setFilters([...filters, { field: def.columns[0], op: 'eq', value: '' }])} className="w-fit text-xs text-white/80 underline">+ add filter</button>
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
        <span className="text-sm text-white/60">{loading ? 'Loading…' : `${rows.length} rows`}</span>
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
          </tbody>
        </table>
      </div>
    </div>
  )
}
