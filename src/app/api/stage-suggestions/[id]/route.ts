import { logActivity, stageClientLabel } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/stage-suggestions/[id] — counselor sign-off on an AI-proposed
// pipeline_stage change. Approving is the only path that actually writes
// clients.pipeline_stage; both outcomes are logged to the audit trail so
// AI-driven stage activity is never invisible again.
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
  const { status } = body as { status?: 'approved' | 'rejected' }

  if (!status || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Missing or invalid status' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: suggestion } = await supabase
    .from('stage_suggestions')
    .select('id, client_id, current_stage, suggested_stage, status')
    .eq('id', id)
    .single()

  if (!suggestion) {
    return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
  }
  if (suggestion.status !== 'pending') {
    return NextResponse.json({ error: 'Suggestion already reviewed' }, { status: 400 })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, counselor_id')
    .eq('id', suggestion.client_id)
    .single()

  const isAdmin = counselor.role === 'admin' || counselor.role === 'ceo'
  if (!client || (!isAdmin && client.counselor_id !== counselor.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (status === 'approved') {
    const { error: updateError } = await supabase
      .from('clients')
      .update({ pipeline_stage: suggestion.suggested_stage, updated_at: new Date().toISOString() })
      .eq('id', suggestion.client_id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 })
    }

    await logActivity({
      clientId: suggestion.client_id,
      counselorId: counselor.id,
      actorRole: counselor.role,
      actionType: 'stage_change',
      description: `${stageClientLabel(suggestion.suggested_stage)} (AI-suggested, approved by ${counselor.name})`,
      visibility: 'shared',
      metadata: {
        pipeline_stage: suggestion.suggested_stage,
        previousStage: suggestion.current_stage,
        source: 'ai_suggestion',
        suggestionId: id,
      },
    })
  } else {
    await logActivity({
      clientId: suggestion.client_id,
      counselorId: counselor.id,
      actorRole: counselor.role,
      actionType: 'stage_suggestion_rejected',
      description: `${counselor.name} rejected an AI-suggested stage change (stage ${suggestion.current_stage} → ${suggestion.suggested_stage})`,
      metadata: {
        suggestedStage: suggestion.suggested_stage,
        previousStage: suggestion.current_stage,
        suggestionId: id,
      },
    })
  }

  const { error } = await supabase
    .from('stage_suggestions')
    .update({
      status,
      reviewed_by: counselor.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 })
  }

  if (status === 'approved') {
    await createNotification({
      counselorId: counselor.id,
      type: 'stage_change',
      title: `Stage updated — ${client.name}`,
      body: `Moved to stage ${suggestion.suggested_stage} (AI-suggested, approved).`,
      clientId: client.id,
    })
  }

  return NextResponse.json({ success: true, status })
}
