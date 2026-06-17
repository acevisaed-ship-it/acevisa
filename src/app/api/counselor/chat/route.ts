import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/counselor/chat  { clientId, message, counselorName }
export async function POST(request: Request) {
  const { clientId, message, counselorName } = await request.json()

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
      counselor_name: counselorName ?? null,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: data })
}
