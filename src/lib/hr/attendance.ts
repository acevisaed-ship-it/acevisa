import { getPKTHourMinute } from '@/lib/pkt'

/** Attendance cutoff — counselors must check in by 11:00 AM PKT. */
export const ATTENDANCE_CUTOFF_HOUR = 11
export const ATTENDANCE_CUTOFF_LABEL = '11:00 AM PKT'

/** Is the given instant (default: now) after the 11:00 AM PKT cutoff? */
export function isPastAttendanceCutoff(date: Date = new Date()): boolean {
  const { hour, minute } = getPKTHourMinute(date)
  return hour > ATTENDANCE_CUTOFF_HOUR || (hour === ATTENDANCE_CUTOFF_HOUR && minute > 0)
}

export const ATTENDANCE_PRESENT_STATUSES = ['present', 'remote', 'half_day'] as const
export const ATTENDANCE_UNEXCUSED_STATUSES = ['late', 'absent'] as const
