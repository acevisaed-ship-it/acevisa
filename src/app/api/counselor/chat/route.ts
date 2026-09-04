import { logActivity } from '@/lib/activityLog'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/counselor/chat  { clientId, message }
export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { clientId, message } = await request.json()

  if (!clientId || !message?.trim()) {
    return NextResponse.json({ error: 'Missing clientId or message' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      client_id: clientId,
      sender: 'counselor',
      message_text: message.trim(),
      counselor_name: counselor.name,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sending a message to the client is a clock-resetting action for idle
  // detection (see activityLog.ts) — only actually resets the clock if
  // this counselor is the client's assigned counselor, same rule as every
  // other idle-clock-eligible action.
  await logActivity({
    clientId,
    counselorId: counselor.id,
    actorRole: counselor.role,
    actionType: 'counselor_message_sent',
    description: `${counselor.name} sent a message to the client`,
  })

  return NextResponse.json({ message: data })
}
