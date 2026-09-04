import { createAdminClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { DEFAULT_SHIFT_END, isPastShiftEnd, isWorkingDayPKT } from '@/lib/hr/attendance'
import { getTodayPKTDateString } from '@/lib/pkt'
import { NextResponse } from 'next/server'

// Runs once every evening (see vercel.json). Any active counselor who never
// checked in today (no attendance_records row at all) and whose shift has
// actually ended by the time this runs is marked absent. Counselors who
// checked in late already have a 'late' row created in real time by
// /api/counselor/attendance — this cron doesn't touch them.
//
// Known limitation of a single fixed daily run: a counselor whose shift
// ends AFTER this cron fires won't be evaluated until the next day's run
// even picks them up (isPastShiftEnd will still be false for them) — a
// true per-shift-end check would need a much more frequent cron. Fine for
// now since shifts are expected to end well before end of day.
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const today = getTodayPKTDateString()
  const now = new Date()
  const supabase = createAdminClient()

  const [{ data: counselors }, { data: existingRecords }] = await Promise.all([
    supabase
      .from('counselors')
      .select('id, name, shift_end_time, working_days')
      .eq('role', 'counselor')
      .eq('status', 'active'),
    supabase.from('attendance_records').select('counselor_id').eq('date', today),
  ])

  const hasRecord = new Set((existingRecords ?? []).map((r) => r.counselor_id))
  const noShows = (counselors ?? []).filter((c) => {
    if (hasRecord.has(c.id)) return false
    const workingDays = c.working_days ?? [1, 2, 3, 4, 5, 6]
    if (!isWorkingDayPKT(today, workingDays)) return false
    const shiftEnd = c.shift_end_time || DEFAULT_SHIFT_END
    return isPastShiftEnd(shiftEnd, now)
  })

  if (noShows.length === 0) {
    return NextResponse.json({ success: true, markedAbsent: 0 })
  }

  const { error } = await supabase.from('attendance_records').insert(
    noShows.map((c) => ({
      counselor_id: c.id,
      date: today,
      status: 'absent',
      is_auto: true,
      notes: 'Auto-flagged — no check-in recorded today',
    }))
  )

  if (error) {
    console.error('[cron/finalize-daily-attendance] insert failed:', error.message)
    return NextResponse.json({ error: 'Failed to record absences' }, { status: 500 })
  }

  for (const c of noShows) {
    await logActivity({
      counselorId: c.id,
      actorRole: 'system',
      actionType: 'attendance_absent',
      description: `${c.name} marked absent — no check-in recorded on ${today}`,
      metadata: { date: today },
    })

    await createNotification({
      counselorId: c.id,
      type: 'attendance_absent',
      title: 'Marked absent today',
      body: `No check-in was recorded for you on ${today}. Submit an application if this needs review.`,
    })
  }

  return NextResponse.json({ success: true, markedAbsent: noShows.length })
}
