import { logActivity } from '@/lib/activityLog'
import { isPastAttendanceCutoff, ATTENDANCE_CUTOFF_LABEL } from '@/lib/hr/attendance'
import { createNotification } from '@/lib/notifications'
import { getTodayPKTDateString, isSundayPKT } from '@/lib/pkt'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/counselor/attendance — today's attendance status for the logged-in staff member.
export async function GET() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = getTodayPKTDateString()
  const supabase = createAdminClient()

  const { data: record } = await supabase
    .from('attendance_records')
    .select('id, date, check_in, check_out, status, notes, is_auto')
    .eq('counselor_id', counselor.id)
    .eq('date', today)
    .maybeSingle()

  return NextResponse.json({
    today,
    isSunday: isSundayPKT(today),
    cutoffLabel: ATTENDANCE_CUTOFF_LABEL,
    record: record ?? null,
  })
}

// POST /api/counselor/attendance — self clock-in / clock-out.
// Body: { action?: 'clock_in' | 'clock_out' } — defaults to 'clock_in'.
// Idempotent: a manually-entered HR record, or an already-recorded
// check-in/check-out, is never silently overwritten.
export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const action = body?.action === 'clock_out' ? 'clock_out' : 'clock_in'

  const today = getTodayPKTDateString()
  const supabase = createAdminClient()
  const now = new Date()
  const nowIso = now.toISOString()

  const { data: existing } = await supabase
    .from('attendance_records')
    .select('id, check_in, check_out, status, is_auto')
    .eq('counselor_id', counselor.id)
    .eq('date', today)
    .maybeSingle()

  if (action === 'clock_out') {
    if (!existing || !existing.check_in) {
      return NextResponse.json({ error: "You haven't checked in today yet" }, { status: 400 })
    }
    if (existing.check_out) {
      return NextResponse.json({ success: true, record: existing, alreadyRecorded: true })
    }

    const { data: updated, error } = await supabase
      .from('attendance_records')
      .update({ check_out: nowIso })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logActivity({
      counselorId: counselor.id,
      actorRole: counselor.role,
      actionType: 'attendance_check_out',
      description: `${counselor.name} checked out`,
      metadata: { date: today, checkOut: nowIso },
    })

    return NextResponse.json({ success: true, record: updated })
  }

  // action === 'clock_in'
  if (isSundayPKT(today)) {
    return NextResponse.json({ error: 'Sunday is not a working day' }, { status: 400 })
  }

  const late = isPastAttendanceCutoff(now)

  // Already have a real check-in, or a manually-entered record from HR —
  // don't touch it.
  if (existing && (existing.check_in || !existing.is_auto)) {
    return NextResponse.json({ success: true, record: existing, alreadyRecorded: true })
  }

  if (existing) {
    // Row exists only because the evening/late-flag automation created a
    // placeholder (is_auto = true, check_in = null) — fill in the real
    // check-in time now, keeping the 'late' status (they still showed up
    // late, that's what happened).
    const { data: updated, error } = await supabase
      .from('attendance_records')
      .update({ check_in: nowIso })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logActivity({
      counselorId: counselor.id,
      actorRole: counselor.role,
      actionType: 'attendance_check_in',
      description: `${counselor.name} checked in late (after ${ATTENDANCE_CUTOFF_LABEL})`,
      metadata: { date: today, checkIn: nowIso },
    })

    return NextResponse.json({ success: true, record: updated })
  }

  const { data: created, error } = await supabase
    .from('attendance_records')
    .insert({
      counselor_id: counselor.id,
      date: today,
      check_in: nowIso,
      status: late ? 'late' : 'present',
      is_auto: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity({
    counselorId: counselor.id,
    actorRole: counselor.role,
    actionType: 'attendance_check_in',
    description: `${counselor.name} checked in ${late ? `late (after ${ATTENDANCE_CUTOFF_LABEL})` : 'on time'}`,
    metadata: { date: today, checkIn: nowIso, status: created.status },
  })

  if (late) {
    await createNotification({
      counselorId: counselor.id,
      type: 'attendance_late',
      title: 'Late attendance recorded',
      body: `${counselor.name} checked in after ${ATTENDANCE_CUTOFF_LABEL} today.`,
    })
  }

  return NextResponse.json({ success: true, record: created })
}
