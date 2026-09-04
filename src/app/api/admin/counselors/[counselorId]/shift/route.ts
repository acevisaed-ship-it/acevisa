import { logStaffActivity } from '@/lib/activityLog'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { formatShiftTimeLabel } from '@/lib/hr/attendance'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// PATCH /api/admin/counselors/[counselorId]/shift — set a counselor's
// expected shift start/end time and working days. Drives attendance
// lateness (see src/lib/hr/attendance.ts) and, once idle-detection is
// working-day-aware, how "2 working days idle" is counted for that
// counselor specifically.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ counselorId: string }> }
) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const { counselorId } = await params
  const body = await request.json()
  const { shiftStartTime, shiftEndTime, workingDays } = body as {
    shiftStartTime?: string
    shiftEndTime?: string
    workingDays?: number[]
  }

  if (!shiftStartTime || !shiftEndTime || !Array.isArray(workingDays)) {
    return NextResponse.json({ error: 'Missing shiftStartTime, shiftEndTime, or workingDays' }, { status: 400 })
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(shiftStartTime) || !/^\d{2}:\d{2}(:\d{2})?$/.test(shiftEndTime)) {
    return NextResponse.json({ error: 'Invalid time format' }, { status: 400 })
  }
  if (workingDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    return NextResponse.json({ error: 'Invalid working days' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Branch Managers may only edit counselors in their own branch.
  if (admin.role === 'admin') {
    const { data: target } = await supabase
      .from('counselors')
      .select('branch_id')
      .eq('id', counselorId)
      .maybeSingle()
    if (!target || target.branch_id !== admin.branch_id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('counselors')
    .update({
      shift_start_time: shiftStartTime,
      shift_end_time: shiftEndTime,
      working_days: workingDays,
    })
    .eq('id', counselorId)
    .select('id, name')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const daysLabel = workingDays
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DOW_LABELS[d])
    .join(', ')

  await logStaffActivity({
    counselorId: admin.id,
    actorRole: admin.role,
    actionType: 'counselor_shift_updated',
    description: `${admin.name} set ${updated.name}'s shift to ${formatShiftTimeLabel(shiftStartTime)}–${formatShiftTimeLabel(shiftEndTime)} (${daysLabel})`,
    metadata: { counselorId, shiftStartTime, shiftEndTime, workingDays },
  })

  return NextResponse.json({ success: true })
}
