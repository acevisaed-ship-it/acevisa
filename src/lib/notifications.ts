import { createAdminClient } from '@/lib/supabase/server'
import { sendPushToCounselor } from '@/lib/push'

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
  | 'task_overdue'
  | 'task_completed'
  | 'task_pending'
  | 'task_closed'
  | 'stage_suggestion'
  | 'stage_change'
  | 'agent_draft'
  | 'attendance_late'
  | 'attendance_absent'
  | 'leave_submitted'
  | 'leave_reviewed'
  | 'client_removed'
  | 'daily_followup'
  | 'team_message'
  | 'team_dm'
  | 'email_update'

// Client events that stay counselor-only — too high-frequency to push up the
// chain to every branch manager and the CEO (routine chat traffic would bury
// the events that actually need attention). Leadership can still open any
// client's chat directly at any time; they're just not pinged per-message.
const NO_FAN_OUT: NotificationType[] = [
  'chat_message',
  'daily_followup',
  'team_message',
  'team_dm',
  'email_update',
  // A stage suggestion is just a pending proposal awaiting the counselor's
  // own review — it's not yet a confirmed accountability event, so it stays
  // counselor-only until they act on it.
  'stage_suggestion',
]

// Staff-only events (no client_id) that must still reach the branch manager
// and CEO — attendance, leave, and task-status changes are accountability
// signals leadership needs regardless of whether a client is attached.
const STAFF_FAN_OUT: NotificationType[] = [
  'attendance_late',
  'attendance_absent',
  'leave_submitted',
  'task_overdue',
  'task_completed',
  'task_pending',
  'task_closed',
]

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

  // Client-relevant event (not chat noise), or a staff accountability event
  // that always escalates → also notify the branch manager(s) of this
  // counselor's branch, and the CEO(s), company-wide.
  const shouldFanOut =
    (!!clientId && !NO_FAN_OUT.includes(type)) || STAFF_FAN_OUT.includes(type)

  if (shouldFanOut) {
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

  // Best-effort Web Push so this reaches the recipient even with the tab
  // closed/minimized. No-ops per-recipient if they have no push subscription,
  // and no-ops entirely if VAPID keys aren't configured.
  await Promise.all(
    Array.from(recipientIds).map((id) => sendPushToCounselor(id, { title, body, tag: type }))
  )
}

/** Ping every other active staff member (Team Hub group chat / board posts). */
export async function notifyStaffExcept({
  exceptId,
  type,
  title,
  body,
}: {
  exceptId: string
  type: NotificationType
  title: string
  body?: string
}) {
  const supabase = createAdminClient()
  const { data: staff } = await supabase
    .from('counselors')
    .select('id')
    .eq('status', 'active')
    .neq('id', exceptId)

  const rows = (staff ?? []).map((s) => ({
    counselor_id: s.id,
    type,
    title,
    body: body || null,
    client_id: null,
    task_id: null,
    meeting_id: null,
  }))
  if (rows.length === 0) return
  const { error } = await supabase.from('notifications').insert(rows)
  if (error) console.error('[notifyStaffExcept] insert failed:', error.message)

  await Promise.all(
    (staff ?? []).map((s) => sendPushToCounselor(s.id, { title, body, tag: type }))
  )
}

export async function notifyTeamHubMessage({
  senderId,
  senderName,
  preview,
  recipientId,
}: {
  senderId: string
  senderName: string
  preview: string
  recipientId?: string
}) {
  const snippet = preview.trim().slice(0, 140) || 'Sent a message'
  if (recipientId) {
    // Private DM — only the recipient. Never fan out to other counselors.
    await createNotification({
      counselorId: recipientId,
      type: 'team_dm',
      title: 'You received a private message',
      body: `${senderName}: ${snippet}`,
    })
    return
  }
  await notifyStaffExcept({
    exceptId: senderId,
    type: 'team_message',
    title: 'New message in team chat',
    body: `${senderName}: ${snippet}`,
  })
}
