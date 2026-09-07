import { createAdminClient } from '@/lib/supabase/server'
import { getTodayPKTDateString } from '@/lib/pkt'
import { ATTENDANCE_UNEXCUSED_STATUSES } from '@/lib/hr/attendance'

export type CeoFocusItem = {
  key: string
  label: string
  count: number
  href: string
  description: string
}

export type CeoFocusSummary = {
  agentEnabled: boolean
  items: CeoFocusItem[]
  totalOpen: number
}

/**
 * Everything currently waiting on the CEO, pulled live rather than relying
 * on the CEO Agent's one narrow autonomous rule (retention risk review) —
 * that rule only ever fires for a counselor with zero closed deals who's
 * flagged high-risk in HR Analytics, so long silent stretches on the agent
 * panel are expected, not necessarily broken. This is the actual "what do
 * I need to check today" checklist: pending approvals, escalations, and
 * flags across every queue a CEO owns, aggregated in one query set.
 */
export async function getCeoFocusSummary(): Promise<CeoFocusSummary> {
  const supabase = createAdminClient()
  const today = getTodayPKTDateString()

  const [
    { data: agentSettings },
    { count: pendingDrafts },
    { count: pendingInactiveRequests },
    { count: pendingCorrections },
    { count: escalatedTasks },
    { count: negligenceFlagged },
    { count: unassignedClients },
    { data: attendanceIssues },
  ] = await Promise.all([
    supabase.from('agent_settings').select('enabled').eq('id', 'ceo_agent').maybeSingle(),
    supabase.from('agent_task_drafts').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('client_inactive_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('client_correction_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('escalated', true)
      .in('status', ['open', 'in_progress']),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('negligence_flagged', true)
      .in('status', ['open', 'in_progress']),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .is('counselor_id', null)
      .neq('status', 'removed'),
    supabase
      .from('attendance_records')
      .select('id, status, counselors(name)')
      .eq('date', today)
      .in('status', ATTENDANCE_UNEXCUSED_STATUSES as unknown as string[]),
  ])

  const items: CeoFocusItem[] = [
    {
      key: 'agent_drafts',
      label: 'CEO Agent drafts to review',
      count: pendingDrafts ?? 0,
      href: '/admin/ceo-agent',
      description: 'Proposed by the daily retention-risk review, waiting on your approve/reject.',
    },
    {
      key: 'inactive_requests',
      label: 'Inactive-client requests',
      count: pendingInactiveRequests ?? 0,
      href: '/admin/inactive-requests',
      description: 'A counselor asked to mark a client active/inactive.',
    },
    {
      key: 'corrections',
      label: 'Correction requests',
      count: pendingCorrections ?? 0,
      href: '/admin/correction-requests',
      description: 'Client-submitted profile corrections awaiting review.',
    },
    {
      key: 'escalated_tasks',
      label: 'Escalated idle follow-ups',
      count: escalatedTasks ?? 0,
      href: '/admin/hr',
      description: 'Idle-detection tasks a counselor left unactioned past the grace period.',
    },
    {
      key: 'negligence',
      label: 'Negligence-flagged tasks',
      count: negligenceFlagged ?? 0,
      href: '/admin/hr',
      description: 'Overdue tasks past their 2-working-day grace period.',
    },
    {
      key: 'unassigned',
      label: 'Unassigned clients',
      count: unassignedClients ?? 0,
      href: '/admin/unassigned',
      description: 'No counselor assigned yet.',
    },
    {
      key: 'attendance',
      label: "Today's attendance issues",
      count: (attendanceIssues ?? []).length,
      href: '/admin/hr',
      description: 'Staff marked late or absent today.',
    },
  ]

  return {
    agentEnabled: agentSettings?.enabled ?? false,
    items,
    totalOpen: items.reduce((sum, i) => sum + i.count, 0),
  }
}
