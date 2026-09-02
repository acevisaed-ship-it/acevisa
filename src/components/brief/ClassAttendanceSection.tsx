import { formatPKTDate } from '@/lib/pkt'
import { BriefCard } from './BriefCard'

export type ClassEnrollmentEntry = {
  enrollmentId: string
  className: string
  subject: string | null
  status: string
  attendanceDates: string[] // 'YYYY-MM-DD', most recent first
}

type Props = {
  enrollments: ClassEnrollmentEntry[]
}

/**
 * Class enrollment + daily attendance for IELTS/other language classes,
 * marked by reception at the front desk (ReceptionistClassAttendance) —
 * surfaced on the client's own profile alongside Office Visits, since it's
 * the same "what reception recorded" category of information.
 */
export function ClassAttendanceSection({ enrollments }: Props) {
  if (enrollments.length === 0) return null

  return (
    <BriefCard>
      <h2 className="text-lg font-bold text-white">Classes &amp; Attendance</h2>
      <p className="mt-1 text-xs italic text-white/50">Marked by reception at the front desk.</p>

      <ul className="mt-4 space-y-3">
        {enrollments.map((e) => (
          <li key={e.enrollmentId} className="rounded-xl border border-white/10 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white/85">
                {e.className}
                {e.subject && <span className="font-normal text-white/50"> · {e.subject}</span>}
              </span>
              {e.status !== 'active' && (
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                  {e.status}
                </span>
              )}
            </div>
            {e.attendanceDates.length > 0 ? (
              <>
                <p className="mt-2 text-xs text-white/50">{e.attendanceDates.length} classes attended</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {e.attendanceDates.slice(0, 12).map((d) => (
                    <span
                      key={d}
                      className="rounded-full px-2 py-0.5 text-[11px] text-white/70"
                      style={{ backgroundColor: 'rgba(13, 148, 136, 0.14)' }}
                    >
                      {formatPKTDate(`${d}T12:00:00+05:00`)}
                    </span>
                  ))}
                  {e.attendanceDates.length > 12 && (
                    <span className="px-1.5 py-0.5 text-[11px] text-white/40">
                      +{e.attendanceDates.length - 12} more
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-2 text-xs text-white/40">No attendance marked yet.</p>
            )}
          </li>
        ))}
      </ul>
    </BriefCard>
  )
}
