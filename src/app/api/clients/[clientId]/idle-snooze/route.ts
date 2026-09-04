import { logActivity } from '@/lib/activityLog'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/clients/[clientId]/idle-snooze — current snooze state, if any.
export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { clientId } = await params
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('clients')
    .select('idle_snooze_until, idle_snooze_reason')
    .eq('id', clientId)
    .maybeSingle()

  return NextResponse.json({
    snoozeUntil: data?.idle_snooze_until ?? null,
    reason: data?.idle_snooze_reason ?? null,
  })
}

// POST /api/clients/[clientId]/idle-snooze — pause the idle-detection clock
// for a legitimate reason ("waiting on embassy 3 weeks") so the daily
// idle-detection sweep doesn't create a follow-up task for this client
// until the given date. Set snoozeUntil to null to clear an active snooze.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { clientId } = await params
  const body = await request.json()
  const { snoozeUntil, reason } = body as { snoozeUntil?: string | null; reason?: string }

  const supabase = createAdminClient()
  const isAdmin = counselor.role === 'admin' || counselor.role === 'ceo'
  const clientQuery = supabase.from('clients').select('id, name').eq('id', clientId)
  const { data: client } = isAdmin
    ? await clientQuery.maybeSingle()
    : await clientQuery.eq('counselor_id', counselor.id).maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('clients')
    .update({
      idle_snooze_until: snoozeUntil || null,
      idle_snoozed_by: snoozeUntil ? counselor.id : null,
      idle_snooze_reason: snoozeUntil ? reason || null : null,
    })
    .eq('id', clientId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logActivity({
    clientId,
    counselorId: counselor.id,
    actorRole: counselor.role,
    actionType: snoozeUntil ? 'idle_clock_snoozed' : 'idle_clock_snooze_cleared',
    description: snoozeUntil
      ? `${counselor.name} paused idle follow-up for ${client.name} until ${snoozeUntil}${reason ? `: ${reason}` : ''}`
      : `${counselor.name} cleared the idle follow-up pause for ${client.name}`,
    metadata: { snoozeUntil: snoozeUntil || null, reason: reason || null },
  })

  return NextResponse.json({ success: true })
}
