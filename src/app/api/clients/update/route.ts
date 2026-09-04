import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { updateClientContactEmail } from '@/lib/auth/updateClientEmail'
import { logActivity, stageClientLabel } from '@/lib/activityLog'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { clientId, pipeline_stage, notes, email } = body as {
    clientId?: string
    pipeline_stage?: number
    notes?: string
    email?: string
  }

  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Confirm counselor owns this client (admins/CEO handled elsewhere on admin routes)
  const { data: owned } = await supabase
    .from('clients')
    .select('id, pipeline_stage')
    .eq('id', clientId)
    .eq('counselor_id', counselor.id)
    .maybeSingle()

  const isAdmin = counselor.role === 'admin' || counselor.role === 'ceo'
  if (!owned && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (email !== undefined) {
    const result = await updateClientContactEmail(supabase, { clientId, email })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    await logActivity({
      clientId,
      counselorId: counselor.id,
      actorRole: counselor.role,
      actionType: 'profile_updated',
      description: `Counselor updated client email to ${result.email}`,
      metadata: { field: 'email', email: result.email },
    })
    return NextResponse.json({ success: true, email: result.email })
  }

  let previousStage = owned?.pipeline_stage
  if (previousStage === undefined && pipeline_stage !== undefined) {
    const { data: current } = await supabase
      .from('clients')
      .select('pipeline_stage')
      .eq('id', clientId)
      .maybeSingle()
    previousStage = current?.pipeline_stage
  }

  const update: Record<string, string | number> = {
    updated_at: new Date().toISOString(),
  }
  if (pipeline_stage !== undefined) update.pipeline_stage = pipeline_stage
  if (notes !== undefined) update.notes = notes

  const query = supabase.from('clients').update(update).eq('id', clientId)
  const { error } = isAdmin
    ? await query
    : await query.eq('counselor_id', counselor.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Auto-log stage changes as shared so the client can see them
  if (pipeline_stage !== undefined) {
    await logActivity({
      clientId,
      counselorId: counselor.id,
      actorRole: counselor.role,
      actionType: 'stage_change',
      description: stageClientLabel(pipeline_stage),
      visibility: 'shared',
      metadata: { pipeline_stage, previousStage },
    })
  }

  return NextResponse.json({ success: true })
}
