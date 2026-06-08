import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import {
  PROFILE_FIELD_LABELS,
  applyApprovedFieldUpdate,
} from '@/lib/profileUpdates'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { status, field } = body as {
    status?: 'approved' | 'rejected'
    field?: string
  }

  if (!status || !field || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json(
      { error: 'Missing or invalid status/field' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data: updateRequest } = await supabase
    .from('profile_update_requests')
    .select('id, client_id, proposed_changes, reviewed_fields, status')
    .eq('id', id)
    .single()

  if (!updateRequest) {
    return NextResponse.json({ error: 'Update request not found' }, { status: 404 })
  }

  const proposedChanges = updateRequest.proposed_changes as Record<string, string>
  if (!(field in proposedChanges)) {
    return NextResponse.json({ error: 'Field not in proposed changes' }, { status: 400 })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, counselor_id')
    .eq('id', updateRequest.client_id)
    .single()

  if (!client || client.counselor_id !== counselor.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const reviewedFields = {
    ...(updateRequest.reviewed_fields as Record<string, string>),
    [field]: status,
  }

  const allReviewed = Object.keys(proposedChanges).every((key) => key in reviewedFields)
  const anyApproved = Object.values(reviewedFields).includes('approved')
  const requestStatus = allReviewed
    ? anyApproved
      ? 'approved'
      : 'rejected'
    : 'pending'

  if (status === 'approved') {
    const { clientUpdates, profileUpdates } = applyApprovedFieldUpdate(
      field,
      proposedChanges[field]
    )

    if (Object.keys(clientUpdates).length > 0) {
      await supabase
        .from('clients')
        .update({ ...clientUpdates, updated_at: new Date().toISOString() })
        .eq('id', client.id)
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { data: existingProfile } = await supabase
        .from('ai_profiles')
        .select('profile_json')
        .eq('client_id', client.id)
        .maybeSingle()

      const mergedProfile = {
        ...(existingProfile?.profile_json as Record<string, unknown> | null),
        ...profileUpdates,
      }

      await supabase.from('ai_profiles').upsert(
        {
          client_id: client.id,
          profile_json: mergedProfile,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id' }
      )
    }
  }

  const { error } = await supabase
    .from('profile_update_requests')
    .update({
      reviewed_fields: reviewedFields,
      status: requestStatus,
      reviewed_by: allReviewed ? counselor.id : null,
      reviewed_at: allReviewed ? new Date().toISOString() : null,
    })
    .eq('id', id)

  if (error) {
    console.error('Profile update review error:', error)
    return NextResponse.json({ error: 'Failed to update request.' }, { status: 500 })
  }

  const fieldLabel = PROFILE_FIELD_LABELS[field] ?? field
  await logActivity({
    clientId: client.id,
    counselorId: counselor.id,
    actionType: status === 'approved' ? 'profile_update_approved' : 'profile_update_rejected',
    description: `Counselor ${status} profile update for ${fieldLabel}: "${proposedChanges[field]}"`,
    metadata: { requestId: id, field, status },
  })

  if (allReviewed) {
    await createNotification({
      counselorId: counselor.id,
      type: 'profile_update',
      title: `Profile update ${requestStatus} — ${client.name}`,
      body: `${fieldLabel} and other pending fields reviewed.`,
      clientId: client.id,
    })
  }

  return NextResponse.json({ success: true, status: requestStatus })
}
