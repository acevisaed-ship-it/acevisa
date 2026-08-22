import { createAdminClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { getTodayPKTDateString, isSundayPKT } from '@/lib/pkt'
import { NextResponse } from 'next/server'

// Runs once every working evening (see vercel.json). Any active counselor
// who never checked in today (no attendance_records row at all) is marked
// absent. Counselors who checked in late already have a 'late' row created
// in real time by /api/counselor/attendance — this cron doesn't touch them.
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const today = getTodayPKTDateString()
  if (isSundayPKT(today)) {
    return NextResponse.json({ success: true, skipped: 'sunday' })
  }

  const supabase = createAdminClient()

  const [{ data: counselors }, { data: existingRecords }] = await Promise.all([
    supabase.from('counselors').select('id, name').eq('role', 'counselor').eq('status', 'active'),
    supabase.from('attendance_records').select('counselor_id').eq('date', today),
  ])

  const hasRecord = new Set((existingRecords ?? []).map((r) => r.counselor_id))
  const noShows = (counselors ?? []).filter((c) => !hasRecord.has(c.id))

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
