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

export function isOverdueInPKT(dueDateIso: string | null): boolean {
  if (!dueDateIso) return false
  const today = getTodayPKTDateString()
  const dueDay = getTodayPKTDateString(new Date(dueDateIso))
  return dueDay < today
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
