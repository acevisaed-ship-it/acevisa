import { logActivity } from '@/lib/activityLog'
import { createAdminClient, getAuthenticatedCounselor, getAuthenticatedAdmin } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ applicationId: string }> }

export async function PATCH(request: Request, { params }: RouteParams) {
  const counselor = await getAuthenticatedCounselor()
  const staff = counselor ?? (await getAuthenticatedAdmin())
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { applicationId } = await params
  const body = await request.json() as {
    status?: string
    program_name?: string
    application_reference?: string
    submitted_date?: string
    decision_date?: string
    note?: string
    visibility?: 'internal' | 'shared'
  }

  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from('applications')
    .select('id, client_id, institution_name, status')
    .eq('id', applicationId)
    .single()
  if (!existing) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  const statusChanged = !!body.status && body.status !== existing.status
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status) update.status = body.status
  if (body.program_name !== undefined) update.program_name = body.program_name
  if (body.application_reference !== undefined) update.application_reference = body.application_reference
  if (body.submitted_date !== undefined) update.submitted_date = body.submitted_date
  if (body.decision_date !== undefined) update.decision_date = body.decision_date

  const { error: updateError } = await supabase.from('applications').update(update).eq('id', applicationId)
  if (updateError) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  if (statusChanged || body.note) {
    await supabase.from('application_updates').insert({
      application_id: applicationId,
      status: statusChanged ? body.status : null,
      note: body.note?.trim() || null,
      visibility: body.visibility === 'internal' ? 'internal' : 'shared',
      created_by: staff.id,
    })
  }

  if (statusChanged) {
    await logActivity({
      clientId: existing.client_id,
      counselorId: staff.id,
      actorRole: staff.role,
      actionType: 'application_status_changed',
      description: `${staff.name} updated ${existing.institution_name} to "${body.status}"`,
      metadata: { applicationId, from: existing.status, to: body.status },
    })
  }

  return NextResponse.json({ success: true })
}
