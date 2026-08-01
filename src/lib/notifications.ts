import { createAdminClient } from '@/lib/supabase/server'

export type NotificationType =
  | 'task_due'
  | 'meeting_request'
  | 'escalation'
  | 'panic'
  | 'profile_update'
  | 'complaint'
  | 'chat_message'
  | 'task_assigned'

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
  await supabase.from('notifications').insert({
    counselor_id: counselorId,
    type,
    title,
    body: body || null,
    client_id: clientId || null,
    task_id: taskId || null,
    meeting_id: meetingId || null,
  })
}
