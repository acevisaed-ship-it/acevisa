import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { logActivity, stageClientLabel } from '@/lib/activityLog'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { clientId, pipeline_stage, notes } = body as {
    clientId?: string
    pipeline_stage?: number
    notes?: string
  }

  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
  }

  const update: Record<string, string | number> = {
    updated_at: new Date().toISOString(),
  }
  if (pipeline_stage !== undefined) update.pipeline_stage = pipeline_stage
  if (notes !== undefined) update.notes = notes

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clients')
    .update(update)
    .eq('id', clientId)
    .eq('counselor_id', counselor.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Auto-log stage changes as shared so the client can see them
  if (pipeline_stage !== undefined) {
    await logActivity({
      clientId,
      counselorId: counselor.id,
      actionType: 'stage_change',
      description: stageClientLabel(pipeline_stage),
      visibility: 'shared',
      metadata: { pipeline_stage },
    })
  }

  return NextResponse.json({ success: true })
}
