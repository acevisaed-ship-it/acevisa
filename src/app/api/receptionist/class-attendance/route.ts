import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { logActivity } from '@/lib/activityLog'
import { createAdminClient } from '@/lib/supabase/server'
import { getTodayPKTDateString } from '@/lib/pkt'
import { NextResponse } from 'next/server'

// POST /api/receptionist/class-attendance — mark a student present in a
// class for today (PKT). Idempotent: re-marking the same enrollment/day is
// treated as success, not an error (the unique constraint is the real
// backstop; we also check first for a cleaner response).
export async function POST(request: Request) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError
  if (!receptionist.branch_id) {
    return NextResponse.json({ error: 'Receptionist is not assigned to a branch' }, { status: 400 })
  }

  const { enrollmentId } = (await request.json()) as { enrollmentId?: string }
  if (!enrollmentId) {
    return NextResponse.json({ error: 'Missing enrollmentId' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: enrollment } = await supabase
    .from('class_enrollments')
    .select('id, class_id, client_id, branch_id, clients(name), classes(name)')
    .eq('id', enrollmentId)
    .eq('branch_id', receptionist.branch_id)
    .maybeSingle()

  if (!enrollment) {
    return NextResponse.json({ error: 'Enrollment not found in your branch' }, { status: 404 })
  }

  const today = getTodayPKTDateString()
  const { data: existing } = await supabase
    .from('class_attendance')
    .select('id')
    .eq('enrollment_id', enrollmentId)
    .eq('attended_on', today)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: true, alreadyMarked: true })
  }

  const { error: insertError } = await supabase.from('class_attendance').insert({
    enrollment_id: enrollmentId,
    class_id: enrollment.class_id,
    client_id: enrollment.client_id,
    branch_id: receptionist.branch_id,
    attended_on: today,
    marked_by: receptionist.id,
  })

  if (insertError) {
    // Unique-violation race (double-click) — treat as success.
    if (insertError.code === '23505') {
      return NextResponse.json({ success: true, alreadyMarked: true })
    }
    console.error('[receptionist/class-attendance] insert error:', insertError.message)
    return NextResponse.json({ error: 'Failed to mark attendance' }, { status: 500 })
  }

  const client = enrollment.clients as unknown as { name: string } | null
  const cls = enrollment.classes as unknown as { name: string } | null

  await logActivity({
    clientId: enrollment.client_id as string,
    counselorId: receptionist.id,
    actorRole: receptionist.role,
    actionType: 'class_attendance_marked',
    description: `${receptionist.name} marked ${client?.name ?? 'client'} present for ${cls?.name ?? 'class'}`,
    metadata: { classId: enrollment.class_id, attendedOn: today },
  })

  return NextResponse.json({ success: true, alreadyMarked: false })
}
