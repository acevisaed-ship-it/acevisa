import { getTodayPKTDateString } from '@/lib/pkt'

// Auto-computed urgency taxonomy — deliberately never a field the task
// creator has to pick (see the CEO's own reasoning: manual urgency fields
// go stale within a week because whoever's under pressure just picks
// whatever's fastest). The one exception is is_milestone, a single
// checkbox at creation time for tasks tied to a pipeline stage rather than
// a calendar date — everything else derives from due_date.
export type UrgencyLevel = 'today' | 'soon' | 'ahead' | 'milestone'

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  today: 'Must complete today',
  soon: 'Due soon',
  ahead: 'Deadline ahead',
  milestone: 'Milestone-based',
}

// Small, deliberately distinct set from the existing accent-bar colors
// (blue/orange/lime) used elsewhere on the task card, since these render
// as a separate badge alongside them, not a replacement.
export const URGENCY_BADGE_CLASS: Record<UrgencyLevel, string> = {
  today: 'border border-red-400/40 bg-red-500/20 text-red-300',
  soon: 'border border-orange/40 bg-orange/15 text-orange',
  ahead: 'border border-blue/30 bg-blue/10 text-blue',
  milestone: 'border border-white/20 bg-white/10 text-white/60',
}

export function computeTaskUrgency({
  dueDate,
  isMilestone,
}: {
  dueDate: string | null
  isMilestone?: boolean | null
}): UrgencyLevel {
  if (isMilestone) return 'milestone'
  if (!dueDate) return 'ahead'

  const today = getTodayPKTDateString()
  const dueDay = getTodayPKTDateString(new Date(dueDate))

  // Due today, or already overdue — calendar-day comparison so a task
  // created at 4pm with a same-day due date still lands here, not pushed
  // out just because there are only a couple of hours left.
  if (dueDay <= today) return 'today'

  const diffDays = Math.round(
    (new Date(`${dueDay}T00:00:00+05:00`).getTime() - new Date(`${today}T00:00:00+05:00`).getTime()) /
      86_400_000
  )

  if (diffDays <= 2) return 'soon'
  return 'ahead'
}
