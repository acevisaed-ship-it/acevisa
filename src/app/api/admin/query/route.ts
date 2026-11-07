import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { writeAudit } from '@/lib/ledger/audit'
import { FILTER_OPS, QUERY_VIEWS, type FilterOp } from '@/lib/ledger/queryViews'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Body = {
  view?: string
  fields?: string[]
  filters?: { field: string; op: FilterOp; value: string }[]
  groupBy?: string[]
  agg?: { fn: 'count' | 'sum'; field?: string }[]
  sort?: { field: string; dir?: 'asc' | 'desc' }
  limit?: number
  export?: 'csv'
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Universal query: allow-listed views/columns only, admin only (branch managers are pinned to their branch),
 * grouping + count/sum, CSV export, and every call is written to audit_events.
 */
export async function POST(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const body = (await request.json().catch(() => ({}))) as Body
  const def = body.view ? QUERY_VIEWS[body.view] : undefined
  if (!body.view || !def) return NextResponse.json({ error: 'Unknown view' }, { status: 400 })

  const allowed = new Set(def.columns)
  const fields = (body.fields?.length ? body.fields : def.columns).filter((f) => allowed.has(f))
  if (fields.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  const groupBy = (body.groupBy ?? []).filter((f) => allowed.has(f))
  const aggs = (body.agg ?? []).filter((a) => a.fn === 'count' || (a.fn === 'sum' && a.field && def.numeric.includes(a.field)))
  const filters = (body.filters ?? []).filter((f) => allowed.has(f.field) && FILTER_OPS.includes(f.op))

  const supabase = createAdminClient()
  const needed = new Set([...fields, ...groupBy, ...aggs.flatMap((a) => (a.field ? [a.field] : []))])
  let q = supabase.from(body.view).select([...needed].join(','))
  if (isBranchScopedAdmin(admin) && allowed.has('branch_id')) q = q.eq('branch_id', admin.branch_id)
  for (const f of filters) {
    if (f.op === 'in') q = q.in(f.field, String(f.value).split(',').map((x) => x.trim()))
    else if (f.op === 'ilike') q = q.ilike(f.field, `%${f.value}%`)
    else if (f.op === 'eq') q = q.eq(f.field, f.value)
    else if (f.op === 'neq') q = q.neq(f.field, f.value)
    else if (f.op === 'gt') q = q.gt(f.field, f.value)
    else if (f.op === 'gte') q = q.gte(f.field, f.value)
    else if (f.op === 'lt') q = q.lt(f.field, f.value)
    else if (f.op === 'lte') q = q.lte(f.field, f.value)
  }
  if (body.sort && allowed.has(body.sort.field)) q = q.order(body.sort.field, { ascending: body.sort.dir !== 'desc' })
  const limit = Math.min(Math.max(body.limit ?? 1000, 1), 20000)
  const { data, error: qError } = await q.limit(limit)
  if (qError) {
    console.error('[query] failed:', qError)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  let rows = (data ?? []) as unknown as Record<string, unknown>[]
  let columns = fields
  if (groupBy.length > 0 || aggs.length > 0) {
    const groups = new Map<string, Record<string, unknown>>()
    for (const r of rows) {
      const key = groupBy.map((g) => String(r[g] ?? '')).join('|')
      const g = groups.get(key) ?? Object.fromEntries(groupBy.map((c) => [c, r[c]]))
      aggs.forEach((a, i) => {
        const name = a.fn === 'count' ? `count_${i}` : `sum_${a.field}`
        g[name] = ((g[name] as number) ?? 0) + (a.fn === 'count' ? 1 : Number(r[a.field!] ?? 0))
      })
      groups.set(key, g)
    }
    rows = [...groups.values()]
    columns = [...groupBy, ...aggs.map((a, i) => (a.fn === 'count' ? `count_${i}` : `sum_${a.field}`))]
  } else {
    rows = rows.map((r) => Object.fromEntries(fields.map((f) => [f, r[f]])))
  }

  await writeAudit({
    actorId: admin.id,
    actorRole: admin.role,
    branchId: admin.branch_id,
    entityType: 'query',
    action: body.export ? 'export' : 'query',
    after: { view: body.view, fields: columns, filters, groupBy, rowCount: rows.length },
  })

  if (body.export === 'csv') {
    const csv = [columns.join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\n')
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${body.view}.csv"` },
    })
  }
  return NextResponse.json({ columns, rows, numeric: def.numeric, views: undefined })
}
