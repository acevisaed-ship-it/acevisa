import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activityLog'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId, text, visibility } = await request.json() as {
    clientId?: string
    text?: string
    visibility?: 'internal' | 'shared'
  }

  if (!clientId || !text?.trim()) {
    return NextResponse.json({ error: 'clientId and text required' }, { status: 400 })
  }

  const vis = visibility === 'shared' ? 'shared' : 'internal'

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, counselor_id')
    .eq('id', clientId)
    .maybeSingle()

  if (!client) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const isLeadership = counselor.role === 'admin' || counselor.role === 'ceo'
  if (client.counselor_id !== counselor.id && !isLeadership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await logActivity({
    clientId,
    counselorId: counselor.id,
    actorRole: counselor.role,
    actionType: vis === 'shared' ? 'counselor_update' : 'counselor_note',
    description: text.trim(),
    visibility: vis,
    metadata: { addedBy: counselor.name },
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
