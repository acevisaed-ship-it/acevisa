import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { createAdminClient } from '@/lib/supabase/server'
import { getTodayPKTDateString } from '@/lib/pkt'
import { NextResponse } from 'next/server'

// GET /api/receptionist/clients/[clientId]/classes — this client's active
// class enrollments in the receptionist's own branch, with whether today's
// attendance has already been marked for each.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError
  if (!receptionist.branch_id) {
    return NextResponse.json({ error: 'Receptionist is not assigned to a branch' }, { status: 400 })
  }

  const { clientId } = await params
  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('branch_id', receptionist.branch_id)
    .maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'Client not found in your branch' }, { status: 404 })
  }

  const { data: enrollments, error } = await supabase
    .from('class_enrollments')
    .select('id, class_id, classes(name, subject, is_active)')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[receptionist/clients/classes] fetch error:', error.message)
    return NextResponse.json({ error: 'Failed to load enrollments' }, { status: 500 })
  }

  const enrollmentIds = (enrollments ?? []).map((e) => e.id)
  const today = getTodayPKTDateString()
  const markedToday = new Set<string>()
  if (enrollmentIds.length > 0) {
    const { data: todayRows } = await supabase
      .from('class_attendance')
      .select('enrollment_id')
      .in('enrollment_id', enrollmentIds)
      .eq('attended_on', today)
    for (const row of todayRows ?? []) markedToday.add(row.enrollment_id as string)
  }

  const result = (enrollments ?? [])
    .filter((e) => {
      const cls = e.classes as unknown as { is_active: boolean } | null
      return cls?.is_active !== false
    })
    .map((e) => {
      const cls = e.classes as unknown as { name: string; subject: string | null } | null
      return {
        enrollmentId: e.id as string,
        classId: e.class_id as string,
        className: cls?.name ?? 'Class',
        subject: cls?.subject ?? null,
        markedToday: markedToday.has(e.id as string),
      }
    })

  return NextResponse.json({ enrollments: result })
}
