import { createAdminClient } from '@/lib/supabase/server'

export type NotificationType =
  | 'task_due'
  | 'meeting_request'
  | 'escalation'
  | 'panic'
  | 'profile_update'
  | 'correction_request'
  | 'complaint'
  | 'chat_message'
  | 'task_assigned'

// Client events that stay counselor-only — too high-frequency to push up the
// chain to every branch manager and the CEO (routine chat traffic would bury
// the events that actually need attention). Leadership can still open any
// client's chat directly at any time; they're just not pinged per-message.
const NO_FAN_OUT: NotificationType[] = ['chat_message']

export async function createNotification({
  counselorId,
  type,
  title,
  body,
  clientId,
  taskId,
  meetingId,
}: {
  counselorId: string
  type: NotificationType
  title: string
  body?: string
  clientId?: string
  taskId?: string
  meetingId?: string
}) {
  const supabase = createAdminClient()
  const recipientIds = new Set<string>([counselorId])

  // Client-relevant event (not chat noise) → also notify the branch manager(s)
  // of this counselor's branch, and the CEO(s), company-wide.
  if (clientId && !NO_FAN_OUT.includes(type)) {
    const { data: primary } = await supabase
      .from('counselors')
      .select('branch_id')
      .eq('id', counselorId)
      .maybeSingle()

    const orFilters = ['role.eq.ceo']
    if (primary?.branch_id) {
      orFilters.push(`and(role.eq.admin,branch_id.eq.${primary.branch_id})`)
    }

    const { data: leadership } = await supabase
      .from('counselors')
      .select('id')
      .or(orFilters.join(','))

    for (const l of leadership ?? []) recipientIds.add(l.id)
  }

  const rows = Array.from(recipientIds).map((id) => ({
    counselor_id: id,
    type,
    title,
    body: body || null,
    client_id: clientId || null,
    task_id: taskId || null,
    meeting_id: meetingId || null,
  }))

  const { error } = await supabase.from('notifications').insert(rows)
  if (error) console.error('[createNotification] insert failed:', error.message)
}
