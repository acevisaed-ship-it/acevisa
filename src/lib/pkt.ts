const PKT_TIMEZONE = 'Asia/Karachi'

export function getTodayPKTDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PKT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getPKTDayBounds(dateString: string): { startUTC: string; endUTC: string } {
  const startUTC = new Date(`${dateString}T00:00:00+05:00`).toISOString()
  const endUTC = new Date(`${dateString}T23:59:59.999+05:00`).toISOString()
  return { startUTC, endUTC }
}

export function addDaysToDateString(dateString: string, days: number): string {
  const date = new Date(`${dateString}T12:00:00+05:00`)
  date.setDate(date.getDate() + days)
  return getTodayPKTDateString(date)
}

export function formatPKTTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: PKT_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoString))
}

export function formatPKTDate(isoString: string): string {
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: PKT_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(isoString))
}

export function formatPKTDateLong(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: PKT_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function getPKTGreeting(date: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-PK', {
      timeZone: PKT_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }).format(date)
  )

  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Sunday is not a working day for attendance/salary purposes. */
export function isSundayPKT(dateString: string): boolean {
  // dateString is a plain YYYY-MM-DD (PKT calendar day) — construct at noon
  // PKT to avoid any UTC rollover shifting the day-of-week.
  const date = new Date(`${dateString}T12:00:00+05:00`)
  return date.getUTCDay() === 0
}

/** Current time-of-day in PKT as {hour, minute}, 24h. */
export function getPKTHourMinute(date: Date = new Date()): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PKT_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  // Intl can return hour === 24 for midnight in some environments
  return { hour: hour === 24 ? 0 : hour, minute }
}

/** Is `dateString`'s day-of-week (0=Sun..6=Sat) one of `workingDays`? Defaults
 *  to the agency's historical Mon-Sat assumption when no per-counselor
 *  schedule is known. */
export function isWorkingDayForPKT(
  dateString: string,
  workingDays: number[] = [1, 2, 3, 4, 5, 6]
): boolean {
  const date = new Date(`${dateString}T12:00:00+05:00`)
  return workingDays.includes(date.getUTCDay())
}

/**
 * Count of `workingDays` that have elapsed strictly after `fromDateString`
 * up to and including `toDateString` (both plain PKT `YYYY-MM-DD` dates).
 * Used for both idle-client detection ("2 working days since last
 * counselor activity") and negligence-flag timing ("2 working days past
 * due date") — both counted against the specific counselor's own schedule
 * rather than a blanket calendar assumption.
 */
export function countElapsedWorkingDays(
  fromDateString: string,
  toDateString: string,
  workingDays: number[] = [1, 2, 3, 4, 5, 6]
): number {
  let count = 0
  let cursor = addDaysToDateString(fromDateString, 1)
  // Safety cap — this only ever walks a handful of days in practice
  // (idle/negligence windows are a few days wide), but never loop forever
  // on a bad input.
  let guard = 0
  while (cursor <= toDateString && guard < 3650) {
    if (isWorkingDayForPKT(cursor, workingDays)) count++
    cursor = addDaysToDateString(cursor, 1)
    guard++
  }
  return count
}

/** Count of working days (excludes Sundays) in a given `YYYY-MM` month, PKT calendar. */
export function workingDaysInPKTMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dateString = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (!isSundayPKT(dateString)) count++
  }
  return count
}

export function isOverdueInPKT(dueDateIso: string | null): boolean {
  if (!dueDateIso) return false
  const today = getTodayPKTDateString()
  const dueDay = getTodayPKTDateString(new Date(dueDateIso))
  return dueDay < today
}

/** Due today, or overdue from an earlier day — i.e. needs action today. */
export function isDueTodayOrOverduePKT(dueDateIso: string | null): boolean {
  if (!dueDateIso) return false
  const today = getTodayPKTDateString()
  const dueDay = getTodayPKTDateString(new Date(dueDateIso))
  return dueDay <= today
}

export function formatPKTDueDate(dueDateIso: string | null): string | null {
  if (!dueDateIso) return null
  return formatPKTDate(dueDateIso)
}

export function formatPKTMeetingHeader(isoString: string): string {
  return `Meeting: ${formatPKTDate(isoString)} — ${formatPKTTime(isoString)} PKT`
}

export function formatPKTRegistrationDate(isoString: string): string {
  return `${formatPKTDate(isoString)}, ${formatPKTTime(isoString)} PKT`
}
