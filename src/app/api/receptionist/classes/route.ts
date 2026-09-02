import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/receptionist/classes — active classes in the receptionist's own
// branch, for the enroll picker on the front-desk Class Attendance card.
export async function GET() {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError
  if (!receptionist.branch_id) {
    return NextResponse.json({ error: 'Receptionist is not assigned to a branch' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, subject, instructor_name, schedule_days, schedule_time')
    .eq('branch_id', receptionist.branch_id)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('[receptionist/classes] fetch error:', error.message)
    return NextResponse.json({ error: 'Failed to load classes' }, { status: 500 })
  }

  const classes = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    instructorName: c.instructor_name,
    scheduleDays: c.schedule_days ?? [],
    scheduleTime: c.schedule_time,
  }))

  return NextResponse.json({ classes })
}
