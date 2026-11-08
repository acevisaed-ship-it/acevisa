import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { ACCOUNTANT_BLOCKED_VIEWS, requireAccountsApi } from '@/lib/admin/requireAccountsApi'
import { writeAudit } from '@/lib/ledger/audit'
import { FILTER_OPS, QUERY_VIEWS, type FilterOp } from '@/lib/ledger/queryViews'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'

type Filter = { field: string; op: FilterOp; value: string | string[] }
type Body = {
  view?: string
  fields?: string[]
  filters?: Filter[]
  groupBy?: string[]
  agg?: { fn: 'count' | 'sum'; field?: string }[]
  sort?: { field: string; dir?: 'asc' | 'desc' }
  limit?: number
  export?: 'csv' | 'xlsx'
  pivot?: string // second field to spread across columns (needs exactly one groupBy)
  facets?: string[]
  totals?: boolean
}

const PAGE = 1000 // Supabase caps each response at 1000 rows, so larger reads are paged
const HARD_MAX = 20000

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Universal query: allow-listed views/columns only, admin only (branch managers are pinned to their branch),
 * grouping + count/sum, CSV export, facet counts for dropdowns, totals over the whole filtered set,
 * and every call is written to audit_events.
 */
export async function POST(request: Request) {
  const { admin, error } = await requireAccountsApi('full')
  if (error) return error

  const body = (await request.json().catch(() => ({}))) as Body
  const viewName = body.view
  const def = viewName ? QUERY_VIEWS[viewName] : undefined
  if (!viewName || !def) return NextResponse.json({ error: 'Unknown view' }, { status: 400 })
  if (admin.role === 'accountant' && ACCOUNTANT_BLOCKED_VIEWS.has(viewName)) {
    return NextResponse.json({ error: 'Payroll and commission data is not available to accountants' }, { status: 403 })
  }

  const allowed = new Set(def.columns)
  const fields = (body.fields?.length ? body.fields : def.columns).filter((f) => allowed.has(f))
  if (fields.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  const groupBy = (body.groupBy ?? []).filter((f) => allowed.has(f))
  const aggs = (body.agg ?? []).filter((a) => a.fn === 'count' || (a.fn === 'sum' && a.field && def.numeric.includes(a.field)))
  const filters = (body.filters ?? []).filter((f) => allowed.has(f.field) && FILTER_OPS.includes(f.op))

  const supabase = createAdminClient()

  // Builds a filtered query. `skip` leaves out one field's own filter so its dropdown can show counts for the other choices.
  const build = (select: string, skip: string | null) => {
    let q = supabase.from(viewName).select(select)
    if (isBranchScopedAdmin(admin) && allowed.has('branch_id')) q = q.eq('branch_id', admin.branch_id)
    for (const f of filters) {
      if (skip && f.field === skip) continue
      const list = Array.isArray(f.value) ? f.value : null
      const one = Array.isArray(f.value) ? f.value.join(',') : f.value
      if (f.op === 'in') q = q.in(f.field, list ?? String(one).split(',').map((x) => x.trim()))
      else if (f.op === 'ilike') q = q.ilike(f.field, `%${one}%`)
      else if (f.op === 'eq') q = q.eq(f.field, one)
      else if (f.op === 'neq') q = q.neq(f.field, one)
      else if (f.op === 'gt') q = q.gt(f.field, one)
      else if (f.op === 'gte') q = q.gte(f.field, one)
      else if (f.op === 'lt') q = q.lt(f.field, one)
      else if (f.op === 'lte') q = q.lte(f.field, one)
    }
    return q
  }

  const fetchAll = async (select: string, skip: string | null, max: number, sort?: Body['sort']) => {
    const out: Record<string, unknown>[] = []
    for (let from = 0; from < max; from += PAGE) {
      const to = Math.min(from + PAGE, max) - 1
      let q = build(select, skip)
      q = sort && allowed.has(sort.field)
        ? q.order(sort.field, { ascending: sort.dir !== 'desc' })
        : q.order(def.columns[0])
      const { data, error: pageError } = await q.range(from, to)
      if (pageError) throw pageError
      const part = (data ?? []) as unknown as Record<string, unknown>[]
      out.push(...part)
      if (part.length < to - from + 1) break
    }
    return out
  }

  const pivot = body.pivot && allowed.has(body.pivot) && groupBy.length === 1 && aggs.length > 0 && body.pivot !== groupBy[0] ? body.pivot : null
  const gb = pivot ? [...groupBy, pivot] : groupBy
  const limit = Math.min(Math.max(body.limit ?? 1000, 1), HARD_MAX)
  const needed = new Set([...fields, ...gb, ...aggs.flatMap((a) => (a.field ? [a.field] : []))])

  let rows: Record<string, unknown>[]
  try {
    rows = await fetchAll([...needed].join(','), null, limit, body.sort)
  } catch (e) {
    console.error('[query] failed:', e)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  let columns = fields
  if (gb.length > 0 || aggs.length > 0) {
    const groups = new Map<string, Record<string, unknown>>()
    for (const r of rows) {
      const key = gb.map((g) => String(r[g] ?? '')).join('|')
      const g = groups.get(key) ?? Object.fromEntries(gb.map((c) => [c, r[c]]))
      aggs.forEach((a, i) => {
        const name = a.fn === 'count' ? `count_${i}` : `sum_${a.field}`
        g[name] = ((g[name] as number) ?? 0) + (a.fn === 'count' ? 1 : Number(r[a.field!] ?? 0))
      })
      groups.set(key, g)
    }
    rows = [...groups.values()]
    columns = [...gb, ...aggs.map((a, i) => (a.fn === 'count' ? `count_${i}` : `sum_${a.field}`))]
    if (pivot) {
      // Spread the second field across columns: one row per first-field value, one column per second-field value, plus a total
      const metric = columns[columns.length - 1]
      const colVals = [...new Set(rows.map((r) => String(r[pivot] ?? '(none)')))].sort()
      const byRow = new Map<string, Record<string, unknown>>()
      for (const r of rows) {
        const k = String(r[groupBy[0]] ?? '')
        const o = byRow.get(k) ?? { [groupBy[0]]: r[groupBy[0]], Total: 0 }
        const c = String(r[pivot] ?? '(none)')
        o[c] = ((o[c] as number) ?? 0) + Number(r[metric] ?? 0)
        o.Total = (o.Total as number) + Number(r[metric] ?? 0)
        byRow.set(k, o)
      }
      rows = [...byRow.values()].sort((a, b) => Number(b.Total) - Number(a.Total))
      const totalRow: Record<string, unknown> = { [groupBy[0]]: 'TOTAL', Total: 0 }
      for (const r of rows) {
        for (const c of colVals) totalRow[c] = ((totalRow[c] as number) ?? 0) + Number(r[c] ?? 0)
        totalRow.Total = (totalRow.Total as number) + Number(r.Total)
      }
      rows.push(totalRow)
      columns = [groupBy[0], ...colVals, 'Total']
    }
  } else {
    rows = rows.map((r) => Object.fromEntries(fields.map((f) => [f, r[f]])))
  }

  await writeAudit({
    actorId: admin.id,
    actorRole: admin.role,
    branchId: admin.branch_id,
    entityType: 'query',
    action: body.export ? 'export' : 'query',
    after: { view: viewName, fields: columns, filters, groupBy, pivot, rowCount: rows.length },
  })

  if (body.export === 'xlsx') {
    const sheet = XLSX.utils.json_to_sheet(rows, { header: columns })
    sheet['!cols'] = columns.map((c) => ({ wch: Math.min(Math.max(c.length + 2, 12), 40) }))
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, viewName.replace(/^v_/, '').slice(0, 31))
    const buf = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${viewName}.xlsx"`,
      },
    })
  }

  if (body.export === 'csv') {
    const csv = [columns.join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\n')
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${viewName}.csv"` },
    })
  }

  // Dropdown options with counts, each computed with every other filter applied
  const facets: Record<string, { value: string; count: number }[]> = {}
  for (const f of (body.facets ?? []).filter((x) => allowed.has(x))) {
    try {
      const counts = new Map<string, number>()
      for (const r of await fetchAll(f, f, HARD_MAX)) {
        if (r[f] == null || r[f] === '') continue
        const k = String(r[f])
        counts.set(k, (counts.get(k) ?? 0) + 1)
      }
      facets[f] = [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count)
    } catch (e) {
      console.error('[query] facet failed:', f, e)
    }
  }

  // Totals cover the whole filtered set, not just the rows on screen
  let totals: { count: number; students: number; sums: Record<string, number>; truncated: boolean } | undefined
  if (body.totals) {
    try {
      const sel = [...(allowed.has('client_id') ? ['client_id'] : []), ...def.numeric].join(',') || def.columns[0]
      const all = await fetchAll(sel, null, HARD_MAX)
      const sums: Record<string, number> = {}
      for (const n of def.numeric) sums[n] = all.reduce((s, r) => s + Number(r[n] ?? 0), 0)
      totals = {
        count: all.length,
        students: allowed.has('client_id') ? new Set(all.map((r) => r.client_id)).size : all.length,
        sums,
        truncated: all.length >= HARD_MAX,
      }
    } catch (e) {
      console.error('[query] totals failed:', e)
    }
  }

  return NextResponse.json({ columns, rows, numeric: def.numeric, facets, totals, pivoted: Boolean(pivot) })
}
