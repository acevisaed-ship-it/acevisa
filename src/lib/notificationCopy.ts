export type StaffAlert = {
  id: string
  type: string
  title: string
  body?: string | null
  client_id?: string | null
  meeting_id?: string | null
}

/** On-screen popup wording — private DMs, team chat, email, and other updates. */
export function getAlertCopy(n: Pick<StaffAlert, 'type' | 'title' | 'body'>): {
  title: string
  body?: string
} {
  const body = n.body?.trim() || undefined
  switch (n.type) {
    case 'team_dm':
      return { title: 'You received a private message', body }
    case 'team_message':
      return { title: 'New message in team chat', body }
    case 'email_update':
      return {
        title: 'You received a new email',
        body: body?.replace(/\s*#uid:\d+\s*$/i, '').trim() || undefined,
      }
    case 'chat_message':
      return { title: 'New client chat message', body }
    case 'task_assigned':
      return { title: 'New task assigned', body }
    case 'task_overdue':
      return { title: 'A task is overdue', body }
    case 'task_completed':
      return { title: 'A task was completed', body }
    case 'task_pending':
      return { title: 'A task was reopened', body }
    case 'task_closed':
      return { title: 'A task was closed', body }
    case 'stage_suggestion':
      return { title: 'AI suggests a stage change — confirm?', body }
    case 'stage_change':
      return { title: 'Client stage updated', body }
    case 'daily_followup':
      return { title: 'Daily follow-up tasks assigned', body }
    case 'meeting_request':
      return { title: 'New meeting request', body }
    case 'leave_reviewed':
      return { title: 'Leave request updated', body }
    case 'leave_submitted':
      return { title: 'New leave application', body }
    case 'attendance_late':
      return { title: 'Late check-in recorded', body }
    case 'attendance_absent':
      return { title: 'Absence recorded', body }
    default:
      return { title: n.title, body }
  }
}

export function getNotificationHref(
  notification: Pick<StaffAlert, 'type' | 'client_id' | 'meeting_id'>,
  context: 'admin' | 'counselor'
): string | null {
  const { type, client_id, meeting_id } = notification

  if (context === 'admin') {
    switch (type) {
      case 'chat_message':
        return client_id ? '/admin/unassigned' : null
      case 'panic':
      case 'meeting_request':
      case 'profile_update':
        return client_id ? `/admin/clients/${client_id}` : null
      case 'correction_request':
        return '/admin/correction-requests'
      case 'complaint':
        return '/admin/complaints'
      case 'task_assigned':
        return '/admin/my-tasks'
      case 'task_overdue':
      case 'task_completed':
      case 'task_pending':
      case 'task_closed':
        return client_id ? `/admin/clients/${client_id}` : null
      case 'stage_suggestion':
      case 'stage_change':
        return client_id ? `/admin/clients/${client_id}` : null
      case 'attendance_late':
      case 'attendance_absent':
      case 'leave_submitted':
        return '/admin/hr'
      case 'client_removed':
        return client_id ? `/admin/clients/${client_id}` : '/admin/clients'
      case 'daily_followup':
        return '/admin/counselors'
      case 'team_message':
      case 'team_dm':
        return '/admin/hub'
      case 'email_update':
        return '/admin/email'
      default:
        return null
    }
  }

  switch (type) {
    case 'chat_message':
    case 'panic':
    case 'profile_update':
      return client_id ? `/dashboard/clients/${client_id}` : null
    case 'meeting_request':
      if (meeting_id) return `/dashboard/brief/${meeting_id}`
      return client_id ? `/dashboard/clients/${client_id}` : null
    case 'complaint':
      return client_id ? `/dashboard/clients/${client_id}` : null
    case 'task_assigned':
    case 'task_overdue':
    case 'daily_followup':
    case 'task_pending':
    case 'task_completed':
    case 'task_closed':
      return '/dashboard/tasks'
    case 'stage_suggestion':
    case 'stage_change':
      return client_id ? `/dashboard/clients/${client_id}` : null
    case 'attendance_late':
    case 'attendance_absent':
    case 'leave_reviewed':
      return '/dashboard/attendance'
    case 'client_removed':
      return null
    case 'team_message':
    case 'team_dm':
      return '/dashboard/hub'
    case 'email_update':
      return '/dashboard/email'
    default:
      return null
  }
}
