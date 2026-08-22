import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activityLog'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import type { QualificationFactor } from '@/types'

type Body = {
  qualified?: boolean
  factors?: QualificationFactor[]
}

/** Manual lead qualification — a counselor's own judgment call, independent of
 * the AI-derived qualification_score. Lets each counselor record whatever
 * factors mattered for that lead, then flip the client to "Qualified". */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { clientId } = await params
  const { qualified, factors } = (await request.json()) as Body

  if (typeof qualified !== 'boolean') {
    return NextResponse.json({ error: 'Missing qualified flag' }, { status: 400 })
  }

  const cleanFactors = Array.isArray(factors)
    ? factors
        .map((f) => ({ label: String(f.label ?? '').trim(), value: String(f.value ?? '').trim() }))
        .filter((f) => f.label && f.value)
        .slice(0, 20)
    : []

  const supabase = createAdminClient()
  const isAdmin = counselor.role === 'admin' || counselor.role === 'ceo'

  const clientQuery = supabase
    .from('clients')
    .select('id, name, counselor_id, pipeline_stage')
    .eq('id', clientId)
  const { data: client } = isAdmin
    ? await clientQuery.maybeSingle()
    : await clientQuery.eq('counselor_id', counselor.id).maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const update: Record<string, unknown> = {
    manually_qualified: qualified,
    manually_qualified_at: qualified ? new Date().toISOString() : null,
    manually_qualified_by: qualified ? counselor.id : null,
    qualification_factors: cleanFactors,
    updated_at: new Date().toISOString(),
  }

  // Qualifying a lead that's still at "New Lead" moves it forward in the
  // pipeline; un-qualifying never moves it backwards automatically (a
  // counselor can always change the stage manually if that's wrong).
  if (qualified && client.pipeline_stage < 2) {
    update.pipeline_stage = 2
  }

  const { error } = await supabase.from('clients').update(update).eq('id', clientId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logActivity({
    clientId,
    counselorId: counselor.id,
    actionType: qualified ? 'manually_qualified' : 'manually_unqualified',
    description: qualified
      ? `${counselor.name} manually qualified this lead (${cleanFactors.length} factor${cleanFactors.length === 1 ? '' : 's'} recorded)`
      : `${counselor.name} removed manual qualification`,
    visibility: 'internal',
    metadata: { factors: cleanFactors },
  })

  return NextResponse.json({ success: true, factors: cleanFactors })
}
