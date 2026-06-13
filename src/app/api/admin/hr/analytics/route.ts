import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/admin/hr/analytics?month=2026-06
// Returns per-counselor KPI: deals, revenue, salary cost, commission, attendance
export async function GET(request: Request) {
  const { error: authError } = await requireAdminApi()
  if (authError) return authError

  const sp = new URL(request.url).searchParams
  const month = sp.get('month') ?? new Date().toISOString().slice(0, 7)
  const [y, m] = month.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString()
  const end = new Date(Date.UTC(y, m, 1)).toISOString()
  const startDate = start.slice(0, 10)
  const endDate = end.slice(0, 10)

  const supabase = createAdminClient()

  const [
    { data: counselors },
    { data: commissionRules },
    { data: deals },
    { data: attendance },
    { data: leaveApps },
  ] = await Promise.all([
    supabase
      .from('counselors')
      .select('id, name, base_salary, commission_rate, status, created_at')
      .eq('role', 'counselor')
      .order('name'),
    supabase.from('commission_rules').select('counselor_id, commission_rate, base_salary'),
    supabase
      .from('deals')
      .select('id, counselor_id, deal_value, stage, actual_close_date')
      .in('stage', ['completed', 'agreement_signed'])
      .gte('actual_close_date', startDate)
      .lte('actual_close_date', endDate),
    supabase
      .from('attendance_records')
      .select('counselor_id, date, status')
      .gte('date', startDate)
      .lt('date', endDate),
    supabase
      .from('leave_applications')
      .select('counselor_id, start_date, end_date, status')
      .eq('status', 'approved')
      .gte('start_date', startDate)
      .lte('start_date', endDate),
  ])

  const totalRevenue = (deals ?? []).reduce((s, d) => s + Number(d.deal_value), 0)

  const result = (counselors ?? []).map((c) => {
    const rule = (commissionRules ?? []).find((r) => r.counselor_id === c.id)
    const baseSalary = Number(rule?.base_salary ?? c.base_salary ?? 0)
    const commissionRate = Number(rule?.commission_rate ?? c.commission_rate ?? 10)

    const counselorDeals = (deals ?? []).filter((d) => d.counselor_id === c.id)
    const dealCount = counselorDeals.length
    const revenueGenerated = counselorDeals.reduce((s, d) => s + Number(d.deal_value), 0)
    const commissionEarned = Math.round((revenueGenerated * commissionRate) / 100)
    const totalCost = baseSalary + commissionEarned

    const businessContributionPct =
      totalRevenue > 0 ? Math.round((revenueGenerated / totalRevenue) * 100) : 0

    // Attendance stats
    const counselorAttendance = (attendance ?? []).filter((a) => a.counselor_id === c.id)
    const presentDays = counselorAttendance.filter((a) =>
      ['present', 'remote', 'half_day'].includes(a.status)
    ).length
    const absentDays = counselorAttendance.filter((a) => a.status === 'absent').length
    const leaveDays = (leaveApps ?? [])
      .filter((l) => l.counselor_id === c.id)
      .reduce((s, l) => {
        const diff =
          (new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) /
          (1000 * 60 * 60 * 24)
        return s + Math.round(diff) + 1
      }, 0)

    // Retention assessment: months since joining
    const joinedMonthsAgo = Math.floor(
      (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
    )
    const retentionRisk =
      dealCount === 0 && joinedMonthsAgo > 3
        ? 'high'
        : businessContributionPct < 5 && joinedMonthsAgo > 6
          ? 'medium'
          : 'low'

    return {
      counselorId: c.id,
      counselorName: c.name,
      status: c.status,
      baseSalary,
      commissionRate,
      commissionEarned,
      totalCost,
      dealCount,
      revenueGenerated,
      businessContributionPct,
      netContribution: revenueGenerated - totalCost,
      roi: totalCost > 0 ? Math.round((revenueGenerated / totalCost) * 100) : 0,
      presentDays,
      absentDays,
      leaveDays,
      joinedMonthsAgo,
      retentionRisk,
    }
  })

  const totalCost = result.reduce((s, c) => s + c.totalCost, 0)

  return NextResponse.json({
    month,
    totalRevenue,
    totalCost,
    counselors: result,
  })
}
