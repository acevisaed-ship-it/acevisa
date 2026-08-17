import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { isCorrectableField } from '@/lib/receptionist/clientForm'
import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { createAdminClient, isBranchScoped } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, error: authError } = await requireAdminApi()
  if (authError) return authError

  const { id } = await params
  const body = (await request.json()) as {
    status?: 'approved' | 'rejected'
    note?: string
  }

  if (body.status !== 'approved' && body.status !== 'rejected') {
    return NextResponse.json({ error: 'Status must be approved or rejected' }, { status: 400 })
  }

  const supabase = createAdminClient()
  let query = supabase
    .from('client_correction_requests')
    .select('*, clients(name, client_code)')
    .eq('id', id)

  if (isBranchScoped(admin) && admin.branch_id) {
    query = query.eq('branch_id', admin.branch_id)
  }

  const { data: row, error: fetchError } = await query.maybeSingle()
  if (fetchError || !row) {
    return NextResponse.json({ error: 'Correction request not found' }, { status: 404 })
  }

  if (row.status !== 'pending') {
    return NextResponse.json({ error: 'This request has already been reviewed' }, { status: 409 })
  }

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('client_correction_requests')
    .update({
      status: body.status,
      reviewed_by: admin.id,
      reviewed_at: now,
      review_note: body.note?.trim() || null,
      updated_at: now,
    })
    .eq('id', id)

  if (updateError) {
    console.error('[admin/correction-requests] update failed:', updateError.message)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }

  const client = row.clients as { name: string; client_code: string } | null
  const clientName = client?.name ?? 'client'
  const fields = Object.keys((row.proposed_changes ?? {}) as Record<string, string>)
    .filter(isCorrectableField)
    .join(', ')

  await logActivity({
    clientId: row.client_id as string,
    counselorId: admin.id,
    actorRole: admin.role,
    actionType: body.status === 'approved' ? 'correction_approved' : 'correction_rejected',
    description:
      body.status === 'approved'
        ? `${admin.name} approved a receptionist correction for ${clientName} (${fields})`
        : `${admin.name} rejected a receptionist correction for ${clientName}`,
    metadata: { requestId: id, note: body.note?.trim() || null },
  })

  await createNotification({
    counselorId: row.requested_by as string,
    type: 'correction_request',
    title:
      body.status === 'approved'
        ? `Correction approved for ${clientName}`
        : `Correction rejected for ${clientName}`,
    body:
      body.status === 'approved'
        ? 'You can now update the client information at the front desk.'
        : body.note?.trim() || 'The request was rejected.',
    clientId: row.client_id as string,
  })

  return NextResponse.json({ success: true })
}
