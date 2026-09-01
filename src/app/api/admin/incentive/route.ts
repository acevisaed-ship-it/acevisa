import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/admin/incentive — returns all counselors with their base_salary, commission_rate, and per-service rates
export async function GET(request: Request) {
  const { admin, error: authError } = await requireAdminApi()
  if (authError) return authError

  const branchScoped = isBranchScopedAdmin(admin)
  // Branch Manager stays locked to their own branch; CEO/unscoped admin can
  // optionally pick one branch via ?branchId= ('all'/omitted = every branch)
  // — Idea #4 universal branch filtering, extended to Incentive Policy.
  // (No date dimension here — a policy is current-state config, not a
  // time-series record, so only branch filtering applies to this section.)
  const requestedBranchId = new URL(request.url).searchParams.get('branchId')
  const effectiveBranchId = branchScoped
    ? admin.branch_id
    : requestedBranchId && requestedBranchId !== 'all'
      ? requestedBranchId
      : null

  const supabase = createAdminClient()

  let counselorsQuery = supabase
    .from('counselors')
    .select('id, name, base_salary, commission_rate, status')
    .eq('role', 'counselor')
    .order('name')

  if (effectiveBranchId) {
    counselorsQuery = counselorsQuery.eq('branch_id', effectiveBranchId)
  }

  const [{ data: counselors }, { data: rules }, { data: policyRules }] = await Promise.all([
    counselorsQuery,
    supabase.from('commission_rules').select('counselor_id, commission_rate, base_salary'),
    supabase.from('commission_policy_rules').select('counselor_id, service_type, commission_rate'),
  ])

  const result = (counselors ?? []).map((c) => {
    const rule = (rules ?? []).find((r) => r.counselor_id === c.id)
    const serviceRates = (policyRules ?? [])
      .filter((r) => r.counselor_id === c.id)
      .reduce<Record<string, number>>((acc, r) => {
        acc[r.service_type] = Number(r.commission_rate)
        return acc
      }, {})
    return {
      counselorId: c.id,
      counselorName: c.name,
      status: c.status,
      baseSalary: Number(rule?.base_salary ?? c.base_salary ?? 0),
      defaultCommissionRate: Number(rule?.commission_rate ?? c.commission_rate ?? 10),
      serviceRates,
    }
  })

  return NextResponse.json({ counselors: result })
}

// POST /api/admin/incentive — upsert base salary, default commission rate, and per-service rates for a counselor
export async function POST(request: Request) {
  const { admin, error: authError } = await requireAdminApi()
  if (authError) return authError

  const body = await request.json()
  const { counselorId, baseSalary, defaultCommissionRate, serviceRates } = body

  if (!counselorId) return NextResponse.json({ error: 'counselorId required' }, { status: 400 })

  const supabase = createAdminClient()

  if (isBranchScopedAdmin(admin)) {
    const { data: counselorRow } = await supabase
      .from('counselors')
      .select('branch_id')
      .eq('id', counselorId)
      .single()
    if (!counselorRow || counselorRow.branch_id !== admin.branch_id) {
      return NextResponse.json({ error: 'Counselor not in your branch' }, { status: 403 })
    }
  }

  // Upsert commission_rules (base salary + default rate)
  const { error: ruleErr } = await supabase.from('commission_rules').upsert(
    {
      counselor_id: counselorId,
      base_salary: Number(baseSalary ?? 0),
      commission_rate: Number(defaultCommissionRate ?? 10),
    },
    { onConflict: 'counselor_id' }
  )
  if (ruleErr) return NextResponse.json({ error: ruleErr.message }, { status: 500 })

  // Also update counselors table columns as source of truth
  await supabase
    .from('counselors')
    .update({
      base_salary: Number(baseSalary ?? 0),
      commission_rate: Number(defaultCommissionRate ?? 10),
    })
    .eq('id', counselorId)

  // Upsert per-service rates
  if (serviceRates && typeof serviceRates === 'object') {
    const rows = Object.entries(serviceRates as Record<string, number>).map(
      ([service_type, rate]) => ({
        counselor_id: counselorId,
        service_type,
        commission_rate: Number(rate),
      })
    )
    if (rows.length > 0) {
      const { error: policyErr } = await supabase
        .from('commission_policy_rules')
        .upsert(rows, { onConflict: 'counselor_id,service_type' })
      if (policyErr) return NextResponse.json({ error: policyErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
