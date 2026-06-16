import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — list complaints for a client
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: complaints, error } = await supabase
    .from('escalations')
    .select('id, question_text, status, counselor_response, timestamp')
    .eq('client_id', clientId)
    .order('timestamp', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ complaints: complaints ?? [] })
}

// POST — raise a new complaint
export async function POST(request: Request) {
  const body = await request.json()
  const { clientId, text } = body as { clientId?: string; text?: string }

  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const supabase = createAdminClient()

  // Verify client exists
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .single()
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const { data: complaint, error } = await supabase
    .from('escalations')
    .insert({
      client_id: clientId,
      question_text: text.trim(),
      status: 'open',
      conversation_context: null,
    })
    .select('id, question_text, status, counselor_response, timestamp')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ complaint })
}
