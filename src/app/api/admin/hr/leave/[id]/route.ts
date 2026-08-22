import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/admin/hr/leave/[id] — approve or reject
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error: authError } = await requireAdminApi()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()
  const { status, reviewNote } = body

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: application } = await supabase
    .from('leave_applications')
    .select('counselor_id, leave_type, start_date, end_date, counselors(name)')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('leave_applications')
    .update({
      status,
      review_note: reviewNote ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (application) {
    const staffName = (application.counselors as unknown as { name: string } | null)?.name
    const typeLabel = application.leave_type.replace('_', ' ')
    const period = `${application.start_date} → ${application.end_date}`

    await logActivity({
      counselorId: admin.id,
      actorRole: admin.role,
      actionType: status === 'approved' ? 'leave_approved' : 'leave_rejected',
      description: `${admin.role === 'ceo' ? 'CEO' : 'Admin'} ${status} ${staffName ?? 'staff'}'s ${typeLabel} application (${period})${
        status === 'rejected' ? ' — salary will be deducted for unexcused days' : ''
      }`,
      metadata: { applicationId: id, status, reviewNote: reviewNote ?? null },
    })

    await createNotification({
      counselorId: application.counselor_id,
      type: 'leave_reviewed',
      title: `Your ${typeLabel} application was ${status}`,
      body:
        reviewNote ||
        (status === 'rejected'
          ? `${period} — rejected. Salary will be deducted for any unexcused working-day late arrival/absence in this period.`
          : `${period} — approved.`),
    })
  }

  return NextResponse.json({ ok: true })
}
