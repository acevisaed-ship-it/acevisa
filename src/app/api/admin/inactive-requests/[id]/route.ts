import { requireCeoApi } from '@/lib/admin/requireAdminApi'
import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { createAdminClient } from '@/lib/supabase/server'
import { closeOpenTasksForInactiveClient } from '@/lib/tasks/closeTasksForInactiveClient'
import { NextResponse } from 'next/server'

// PATCH /api/admin/inactive-requests/[id] — CEO approves or rejects. Unlike
// client_correction_requests there's no separate "apply" step: approving
// flips clients.pipeline_active immediately, since the CEO is the only actor
// on the other side of this workflow anyway.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error: authError } = await requireCeoApi()
  if (authError) return authError

  const { id } = await params
  const body = (await request.json()) as { status?: 'approved' | 'rejected'; note?: string }

  if (body.status !== 'approved' && body.status !== 'rejected') {
    return NextResponse.json({ error: 'Status must be approved or rejected' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: row, error: fetchError } = await supabase
    .from('client_inactive_requests')
    .select('*, clients(name)')
    .eq('id', id)
    .maybeSingle()

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }
  if (row.status !== 'pending') {
    return NextResponse.json({ error: 'This request has already been reviewed' }, { status: 409 })
  }

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('client_inactive_requests')
    .update({
      status: body.status,
      reviewed_by: admin.id,
      reviewed_at: now,
      review_note: body.note?.trim() || null,
      updated_at: now,
    })
    .eq('id', id)

  if (updateError) {
    console.error('[admin/inactive-requests] update failed:', updateError.message)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }

  const client = row.clients as { name: string } | null
  const clientName = client?.name ?? 'client'
  const requestedActive = row.requested_active as boolean

  if (body.status === 'approved') {
    const { error: clientUpdateError } = await supabase
      .from('clients')
      .update({ pipeline_active: requestedActive, updated_at: now })
      .eq('id', row.client_id as string)

    if (clientUpdateError) {
      console.error('[admin/inactive-requests] client update failed:', clientUpdateError.message)
      return NextResponse.json({ error: 'Approved but failed to update the client' }, { status: 500 })
    }

    if (!requestedActive) {
      await closeOpenTasksForInactiveClient(supabase, row.client_id as string, admin.id)
    }
  }

  await logActivity({
    clientId: row.client_id as string,
    counselorId: admin.id,
    actorRole: admin.role,
    actionType: body.status === 'approved' ? 'inactive_request_approved' : 'inactive_request_rejected',
    description:
      body.status === 'approved'
        ? `${admin.name} approved marking ${clientName} as ${requestedActive ? 'active' : 'inactive'}`
        : `${admin.name} rejected the ${requestedActive ? 'reactivation' : 'inactive'} request for ${clientName}`,
    metadata: { requestId: id, requestedActive, note: body.note?.trim() || null },
  })

  await createNotification({
    counselorId: row.requested_by as string,
    type: 'inactive_request',
    title:
      body.status === 'approved'
        ? `${requestedActive ? 'Reactivation' : 'Inactive'} request approved for ${clientName}`
        : `Request rejected for ${clientName}`,
    body:
      body.status === 'approved'
        ? `${clientName} is now marked ${requestedActive ? 'active' : 'inactive'}.`
        : body.note?.trim() || 'The CEO rejected this request.',
    clientId: row.client_id as string,
  })

  return NextResponse.json({ success: true })
}
