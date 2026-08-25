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
  // Verify counselor owns this client
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('counselor_id', counselor.id)
    .single()

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await logActivity({
    clientId,
    counselorId: counselor.id,
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
