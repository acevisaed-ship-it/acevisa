import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function parseMonth(monthParam: string | null) {
  const now = new Date()
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : fallback
  const [year, mon] = month.split('-').map(Number)
  const start = new Date(Date.UTC(year, mon - 1, 1))
  const end = new Date(Date.UTC(year, mon, 1))
  return { month, start: start.toISOString(), end: end.toISOString() }
}

export async function GET(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const monthParam = new URL(request.url).searchParams.get('month')
  const { month, start, end } = parseMonth(monthParam)

  const branchScoped = isBranchScopedAdmin(admin)
  const supabase = createAdminClient()

  let counselorsQuery = supabase
    .from('counselors')
    .select('id, name, base_salary, commission_rate')
    .eq('role', 'counselor')
    .eq('status', 'active')
    .order('name')

  let clientsQuery = supabase.from('clients').select('id, counselor_id, qualification_score, branch_id')

  if (branchScoped) {
    counselorsQuery = counselorsQuery.eq('branch_id', admin.branch_id)
    clientsQuery = clientsQuery.eq('branch_id', admin.branch_id)
  }

  const [
    { data: counselors },
    { data: clients },
    { data: meetings },
    { data: responseRows },
    { data: tasks },
    { data: commissionRules },
    { data: closedDeals },
  ] = await Promise.all([
    counselorsQuery,
    clientsQuery,
    supabase
      .from('meetings')
      .select('counselor_id, status, scheduled_time')
      .gte('scheduled_time', start)
      .lt('scheduled_time', end)
      .in('status', ['scheduled', 'completed']),
    supabase
      .from('response_tracking')
      .select('counselor_id, response_time_seconds, response_by, response_at')
      .eq('response_by', 'counselor')
      .not('response_time_seconds', 'is', null)
      .gte('response_at', start)
      .lt('response_at', end),
    supabase
      .from('tasks')
      .select('counselor_id, status, negligence_flagged'),
    supabase.from('commission_rules').select('counselor_id, commission_rate, base_salary'),
    supabase
      .from('deals')
      .select('id, counselor_id, deal_value, stage, actual_close_date')
      .in('stage', ['completed', 'agreement_signed'])
      .gte('actual_close_date', start.slice(0, 10))
      .lte('actual_close_date', end.slice(0, 10)),
  ])

  // Raw attendance counts — team performance counts every late arrival and
  // absence regardless of whether a leave/excuse application was later
  // approved. Approval only affects payroll deduction (HR Analytics), never
  // this accountability view.
  const { data: attendanceIssues } = await supabase
    .from('attendance_records')
    .select('counselor_id, status')
    .gte('date', start.slice(0, 10))
    .lt('date', end.slice(0, 10))
    .in('status', ['late', 'absent'])

  const totalRevenue = (closedDeals ?? []).reduce((s, d) => s + Number(d.deal_value), 0)

  const performance = (counselors ?? []).map((counselor) => {
    const counselorClients = (clients ?? []).filter((c) => c.counselor_id === counselor.id)
    const totalClients = counselorClients.length
    const qualifiedClients = counselorClients.filter(
      (c) => (c.qualification_score ?? 0) >= 7
    ).length
    const conversionRate = totalClients > 0 ? (qualifiedClients / totalClients) * 100 : 0

    const meetingsThisMonth = (meetings ?? []).filter(
      (m) => m.counselor_id === counselor.id
    ).length

    const counselorResponses = (responseRows ?? []).filter(
      (r) => r.counselor_id === counselor.id
    )
    const avgResponseTimeSeconds =
      counselorResponses.length > 0
        ? counselorResponses.reduce((sum, r) => sum + (r.response_time_seconds ?? 0), 0) /
          counselorResponses.length
        : null

    const counselorTasks = (tasks ?? []).filter((t) => t.counselor_id === counselor.id)
    const openTasks = counselorTasks.filter((t) => t.status === 'pending').length
    const negligenceFlags = counselorTasks.filter((t) => t.negligence_flagged).length

    const counselorAttendanceIssues = (attendanceIssues ?? []).filter(
      (a) => a.counselor_id === counselor.id
    )
    const lateDays = counselorAttendanceIssues.filter((a) => a.status === 'late').length
    const absenceDays = counselorAttendanceIssues.filter((a) => a.status === 'absent').length

    // Cost & contribution
    const rule = (commissionRules ?? []).find((r) => r.counselor_id === counselor.id)
    const baseSalary = Number(rule?.base_salary ?? counselor.base_salary ?? 0)
    const commissionRate = Number(rule?.commission_rate ?? counselor.commission_rate ?? 10)
    const counselorDeals = (closedDeals ?? []).filter((d) => d.counselor_id === counselor.id)
    const revenueGenerated = counselorDeals.reduce((s, d) => s + Number(d.deal_value), 0)
    const commissionEarned = Math.round((revenueGenerated * commissionRate) / 100)
    const totalCost = baseSalary + commissionEarned
    const businessContributionPct =
      totalRevenue > 0 ? Math.round((revenueGenerated / totalRevenue) * 100) : 0

    return {
      counselorId: counselor.id,
      counselorName: counselor.name,
      activeClients: totalClients,
      meetingsThisMonth,
      avgResponseTimeSeconds,
      openTasks,
      negligenceFlags,
      conversionRate: Math.round(conversionRate * 10) / 10,
      needsAttention: negligenceFlags > 0 || absenceDays > 0,
      lateDays,
      absenceDays,
      baseSalary,
      commissionEarned,
      totalCost,
      revenueGenerated,
      businessContributionPct,
      dealsClosed: counselorDeals.length,
    }
  })

  return NextResponse.json({ month, counselors: performance })
}
