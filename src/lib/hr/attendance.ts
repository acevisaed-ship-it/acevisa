import { getPKTHourMinute, isWorkingDayForPKT } from '@/lib/pkt'

/**
 * Attendance is now per-counselor: each counselor has their own
 * shift_start_time / shift_end_time (Postgres `time`, e.g. "09:00:00"),
 * defaulting to 9:00 AM–5:00 PM PKT if never set (see migration
 * 20260904000000_idle_detection_shifts_urgency.sql). Replaces the old
 * single global ATTENDANCE_CUTOFF_HOUR = 11 constant.
 */

export const DEFAULT_SHIFT_START = '09:00:00'
export const DEFAULT_SHIFT_END = '17:00:00'

/** Grace window after shift start before a late check-in actually counts
 *  against the counselor — HR is not flagged if they check in inside it. */
export const ATTENDANCE_GRACE_MINUTES = 15

function parseTimeOfDay(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':').map(Number)
  return { hour: h || 0, minute: m || 0 }
}

function minutesOfDay(hour: number, minute: number): number {
  return hour * 60 + minute
}

function minutesOfDayPKT(date: Date): number {
  const { hour, minute } = getPKTHourMinute(date)
  return minutesOfDay(hour, minute)
}

function minutesOfDayFromTimeString(value: string): number {
  const { hour, minute } = parseTimeOfDay(value)
  return minutesOfDay(hour, minute)
}

/** "09:00:00" -> "9:00 AM PKT" */
export function formatShiftTimeLabel(value: string): string {
  const { hour, minute } = parseTimeOfDay(value)
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${period} PKT`
}

/** Is `date` at/after this counselor's shift start? (nominal "on time" line) */
export function isPastShiftStart(shiftStartTime: string, date: Date = new Date()): boolean {
  return minutesOfDayPKT(date) > minutesOfDayFromTimeString(shiftStartTime)
}

/**
 * Is `date` past shift start PLUS the 15-minute grace period? This is the
 * real "you are now late" boundary — checking in inside the grace window
 * still records status 'present', not 'late', so HR never sees a flag for
 * it (a heads-up notification fires at check-in either way, see the
 * clock-in route).
 */
export function isPastAttendanceGrace(shiftStartTime: string, date: Date = new Date()): boolean {
  return minutesOfDayPKT(date) > minutesOfDayFromTimeString(shiftStartTime) + ATTENDANCE_GRACE_MINUTES
}

/** Is `date` at/after this counselor's shift end? Used by the evening
 *  absence cron so a counselor whose shift ends later isn't marked absent
 *  before their shift has actually finished. */
export function isPastShiftEnd(shiftEndTime: string, date: Date = new Date()): boolean {
  return minutesOfDayPKT(date) >= minutesOfDayFromTimeString(shiftEndTime)
}

export const ATTENDANCE_PRESENT_STATUSES = ['present', 'remote', 'half_day'] as const
export const ATTENDANCE_UNEXCUSED_STATUSES = ['late', 'absent'] as const

/** 0=Sunday..6=Saturday, matching Postgres EXTRACT(DOW) / JS Date#getDay(). */
export const isWorkingDayPKT = isWorkingDayForPKT
