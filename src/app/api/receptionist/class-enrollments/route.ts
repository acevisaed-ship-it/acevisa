import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { logActivity } from '@/lib/activityLog'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/receptionist/class-enrollments — enroll a client (already in
// this branch) into a class (also in this branch). Re-enrolling into the
// same class is a no-op success, not an error — the front desk shouldn't
// have to remember who's already in.
export async function POST(request: Request) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError
  if (!receptionist.branch_id) {
    return NextResponse.json({ error: 'Receptionist is not assigned to a branch' }, { status: 400 })
  }

  const { clientId, classId } = (await request.json()) as { clientId?: string; classId?: string }
  if (!clientId || !classId) {
    return NextResponse.json({ error: 'Missing clientId or classId' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const [{ data: client }, { data: cls }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('id', clientId).eq('branch_id', receptionist.branch_id).maybeSingle(),
    supabase.from('classes').select('id, name').eq('id', classId).eq('branch_id', receptionist.branch_id).eq('is_active', true).maybeSingle(),
  ])

  if (!client) return NextResponse.json({ error: 'Client not found in your branch' }, { status: 404 })
  if (!cls) return NextResponse.json({ error: 'Class not found in your branch' }, { status: 404 })

  const { data: existing } = await supabase
    .from('class_enrollments')
    .select('id, status')
    .eq('client_id', clientId)
    .eq('class_id', classId)
    .maybeSingle()

  let enrollmentId: string
  if (existing) {
    if (existing.status !== 'active') {
      await supabase.from('class_enrollments').update({ status: 'active' }).eq('id', existing.id)
    }
    enrollmentId = existing.id
  } else {
    const { data: created, error: insertError } = await supabase
      .from('class_enrollments')
      .insert({
        client_id: clientId,
        class_id: classId,
        branch_id: receptionist.branch_id,
        enrolled_by: receptionist.id,
      })
      .select('id')
      .single()

    if (insertError || !created) {
      console.error('[receptionist/class-enrollments] insert error:', insertError?.message)
      return NextResponse.json({ error: 'Failed to enroll client' }, { status: 500 })
    }
    enrollmentId = created.id

    await logActivity({
      clientId,
      counselorId: receptionist.id,
      actorRole: receptionist.role,
      actionType: 'class_enrolled',
      description: `${receptionist.name} enrolled ${client.name} in ${cls.name}`,
      metadata: { classId, className: cls.name },
    })
  }

  return NextResponse.json({ success: true, enrollmentId })
}
