import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { getTeamPanelMetrics } from '@/lib/admin/getTeamPanelMetrics'
import { createAdminClient } from '@/lib/supabase/server'
import { isBranchScoped } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/admin/team-metrics — per-counselor Team Panel metrics for today
// (PKT calendar day): task counts across the 4-state workflow, plus both
// time-on-portal measures (attendance clock + heartbeat active time).
export async function GET() {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const supabase = createAdminClient()

  let counselorsQuery = supabase
    .from('counselors')
    .select('id')
    .in('role', ['counselor', 'admin'])
    .eq('status', 'active')

  if (isBranchScoped(admin)) {
    counselorsQuery = counselorsQuery.eq('branch_id', admin.branch_id)
  }

  const { data: counselors } = await counselorsQuery
  const counselorIds = (counselors ?? []).map((c) => c.id)

  const metrics = await getTeamPanelMetrics(counselorIds)

  return NextResponse.json({
    metrics: Array.from(metrics.values()),
  })
}
