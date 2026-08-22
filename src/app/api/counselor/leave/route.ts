import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_TYPES = ['annual', 'sick', 'emergency', 'unpaid', 'late_excuse', 'absence_excuse', 'other']

// GET /api/counselor/leave — the logged-in staff member's own applications.
export async function GET() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('leave_applications')
    .select('id, leave_type, start_date, end_date, reason, status, review_note, reviewed_at, created_at')
    .eq('counselor_id', counselor.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ applications: data ?? [] })
}

// POST /api/counselor/leave — submit a leave, late-arrival, or absence
// excuse application for admin/CEO approval. Always scoped to the logged-in
// counselor — they cannot submit on behalf of anyone else.
export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { leaveType, startDate, endDate, reason } = body as {
    leaveType?: string
    startDate?: string
    endDate?: string
    reason?: string
  }

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 })
  }
  const type = leaveType && VALID_TYPES.includes(leaveType) ? leaveType : 'annual'

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('leave_applications')
    .insert({
      counselor_id: counselor.id,
      leave_type: type,
      start_date: startDate,
      end_date: endDate,
      reason: reason || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity({
    counselorId: counselor.id,
    actorRole: counselor.role,
    actionType: 'leave_submitted',
    description: `${counselor.name} submitted a ${type.replace('_', ' ')} application (${startDate} → ${endDate})`,
    metadata: { applicationId: data.id, leaveType: type, startDate, endDate },
  })

  await createNotification({
    counselorId: counselor.id,
    type: 'leave_submitted',
    title: `${counselor.name} submitted an application for approval`,
    body: `${type.replace('_', ' ')} · ${startDate} → ${endDate}${reason ? ` — "${reason}"` : ''}`,
  })

  return NextResponse.json({ application: data })
}
