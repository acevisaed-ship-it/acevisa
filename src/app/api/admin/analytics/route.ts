import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  const supabase = createAdminClient()

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString()

  const [
    { count: totalClients },
    { count: activeClients },
    { count: unassignedClients },
    { count: totalCounselors },
    { count: openComplaints },
    { count: openTasks },
    { count: overdueTasks },
    { data: meetingsThisMonth },
    { data: revenueData },
    { data: dealsData },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }).not('counselor_id', 'is', null),
    supabase.from('clients').select('*', { count: 'exact', head: true }).is('counselor_id', null),
    supabase.from('counselors').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('role', 'counselor'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('negligence_flagged', true),
    supabase.from('meetings').select('id, status').gte('scheduled_time', monthStart),
    supabase.from('invoices').select('total, status, paid_at').gte('paid_at', monthStart).eq('status', 'paid'),
    supabase.from('deals').select('stage, deal_value'),
  ])

  const revenueThisMonth = (revenueData ?? []).reduce((sum, i) => sum + Number(i.total), 0)
  const meetingsCount = (meetingsThisMonth ?? []).length
  const completedMeetings = (meetingsThisMonth ?? []).filter((m) => m.status === 'completed').length

  const pipelineValue = (dealsData ?? [])
    .filter((d) => !['completed', 'lost'].includes(d.stage))
    .reduce((sum, d) => sum + Number(d.deal_value), 0)

  return NextResponse.json({
    totalClients: totalClients ?? 0,
    activeClients: activeClients ?? 0,
    unassignedClients: unassignedClients ?? 0,
    totalCounselors: totalCounselors ?? 0,
    openComplaints: openComplaints ?? 0,
    openTasks: openTasks ?? 0,
    overdueTasks: overdueTasks ?? 0,
    meetingsThisMonth: meetingsCount,
    completedMeetings,
    revenueThisMonth,
    pipelineValue,
  })
}
