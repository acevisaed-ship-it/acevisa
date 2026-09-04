import { logActivity } from '@/lib/activityLog'
import {
  DEFAULT_SHIFT_START,
  DEFAULT_SHIFT_END,
  ATTENDANCE_GRACE_MINUTES,
  formatShiftTimeLabel,
  isPastAttendanceGrace,
  isWorkingDayPKT,
} from '@/lib/hr/attendance'
import { createNotification } from '@/lib/notifications'
import { getTodayPKTDateString } from '@/lib/pkt'
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
  const shiftStart = counselor.shift_start_time || DEFAULT_SHIFT_START
  const shiftEnd = counselor.shift_end_time || DEFAULT_SHIFT_END
  const workingDays = counselor.working_days ?? [1, 2, 3, 4, 5, 6]

  const { data: record } = await supabase
    .from('attendance_records')
    .select('id, date, check_in, check_out, status, notes, is_auto')
    .eq('counselor_id', counselor.id)
    .eq('date', today)
    .maybeSingle()

  return NextResponse.json({
    today,
    isSunday: !isWorkingDayPKT(today, workingDays),
    shiftStartLabel: formatShiftTimeLabel(shiftStart),
    shiftEndLabel: formatShiftTimeLabel(shiftEnd),
    graceMinutes: ATTENDANCE_GRACE_MINUTES,
    // Kept for anything still reading the old field name.
    cutoffLabel: formatShiftTimeLabel(shiftStart),
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
  const shiftStart = counselor.shift_start_time || DEFAULT_SHIFT_START
  const shiftStartLabel = formatShiftTimeLabel(shiftStart)
  const workingDays = counselor.working_days ?? [1, 2, 3, 4, 5, 6]

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
  if (!isWorkingDayPKT(today, workingDays)) {
    return NextResponse.json({ error: 'Today is not one of your scheduled working days' }, { status: 400 })
  }

  // Past shift start + the 15-minute grace period = genuinely late (the
  // status/flag HR sees). Checking in inside the grace window still counts
  // as 'present' — no flag — but the counselor gets an honest heads-up
  // either way so they know where they stand.
  const late = isPastAttendanceGrace(shiftStart, now)
  const withinGrace = !late && now.getTime() > new Date(`${today}T${shiftStart}+05:00`).getTime()

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
      description: `${counselor.name} checked in late (after ${shiftStartLabel})`,
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
    description: late
      ? `${counselor.name} checked in late (after ${shiftStartLabel} + ${ATTENDANCE_GRACE_MINUTES}min grace)`
      : withinGrace
        ? `${counselor.name} checked in within the ${ATTENDANCE_GRACE_MINUTES}-minute grace period after ${shiftStartLabel}`
        : `${counselor.name} checked in on time`,
    metadata: { date: today, checkIn: nowIso, status: created.status },
  })

  if (late) {
    await createNotification({
      counselorId: counselor.id,
      type: 'attendance_late',
      title: 'Late attendance recorded',
      body: `${counselor.name} checked in after ${shiftStartLabel} (past the ${ATTENDANCE_GRACE_MINUTES}-minute grace period) today.`,
    })
  } else if (withinGrace) {
    // Heads-up only — not an HR flag. Counselor-only notification (no
    // fan-out), same as the friendly nudge the user asked for: "reminded
    // and told that they have been marked as late" without it actually
    // counting against them since they made it inside the grace window.
    await createNotification({
      counselorId: counselor.id,
      type: 'attendance_late',
      title: "Checked in after your start time — you're inside the grace period",
      body: `Your shift starts at ${shiftStartLabel}. You checked in within the ${ATTENDANCE_GRACE_MINUTES}-minute grace period, so this is not recorded as late.`,
    })
  }

  return NextResponse.json({ success: true, record: created })
}
