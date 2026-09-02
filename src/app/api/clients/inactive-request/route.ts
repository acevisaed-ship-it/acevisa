import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { NextResponse } from 'next/server'

// POST /api/clients/inactive-request — a counselor (or admin) asks the CEO
// to mark a client inactive, or to reactivate one that already is. Direction
// is always the opposite of the client's current pipeline_active, so the
// caller doesn't need to know or send it.
export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { clientId, reason } = body as { clientId?: string; reason?: string }

  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, counselor_id, branch_id, pipeline_active')
    .eq('id', clientId)
    .maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const isAdmin = counselor.role === 'admin' || counselor.role === 'ceo'
  if (!isAdmin && client.counselor_id !== counselor.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: existing } = await supabase
    .from('client_inactive_requests')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'A request for this client is already pending CEO review.' },
      { status: 409 }
    )
  }

  const requestedActive = !(client.pipeline_active ?? true)
  // CEO is the approver — applying from the client page shouldn't create a
  // pending row they'd then have to approve themselves.
  const applyNow = counselor.role === 'ceo'
  const now = new Date().toISOString()

  const { data: inserted, error } = await supabase
    .from('client_inactive_requests')
    .insert({
      client_id: clientId,
      requested_by: counselor.id,
      branch_id: client.branch_id,
      requested_active: requestedActive,
      reason: reason?.trim() || null,
      status: applyNow ? 'approved' : 'pending',
      reviewed_by: applyNow ? counselor.id : null,
      reviewed_at: applyNow ? now : null,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    console.error('[clients/inactive-request] insert failed:', error?.message)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }

  if (applyNow) {
    const { error: clientUpdateError } = await supabase
      .from('clients')
      .update({ pipeline_active: requestedActive, updated_at: now })
      .eq('id', clientId)

    if (clientUpdateError) {
      console.error('[clients/inactive-request] client update failed:', clientUpdateError.message)
      return NextResponse.json(
        { error: 'Saved the request but failed to update the client' },
        { status: 500 }
      )
    }
  }

  await logActivity({
    clientId,
    counselorId: counselor.id,
    actorRole: counselor.role,
    actionType: applyNow ? 'inactive_request_approved' : 'inactive_requested',
    description: applyNow
      ? `${counselor.name} marked ${client.name} as ${requestedActive ? 'active' : 'inactive'}`
      : `${counselor.name} requested marking ${client.name} as ${requestedActive ? 'active' : 'inactive'}`,
    metadata: { requestId: inserted.id, requestedActive, reason: reason?.trim() || null },
  })

  if (!applyNow) {
    // Fan-out to CEO (and branch admin) — skip when the CEO already applied.
    await createNotification({
      counselorId: counselor.id,
      type: 'inactive_request',
      title: `${requestedActive ? 'Reactivation' : 'Inactive'} request for ${client.name}`,
      body: `${counselor.name} asked to mark this client ${requestedActive ? 'active' : 'inactive'}${
        reason?.trim() ? ` — ${reason.trim()}` : ''
      }`,
      clientId,
    })
  }

  return NextResponse.json({
    success: true,
    id: inserted.id,
    requestedActive,
    applied: applyNow,
  })
}
