import { createAdminClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/utils'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { clientId, questionText, conversationContext } = await request.json()

  if (!clientId || !questionText) {
    return NextResponse.json(
      { error: 'Missing clientId or questionText' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data: escalation, error } = await supabase
    .from('escalations')
    .insert({
      client_id: clientId,
      question_text: questionText,
      conversation_context: conversationContext || [],
      status: 'open',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Escalation insert error:', error)
    return NextResponse.json({ error: 'Failed to create escalation' }, { status: 500 })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('counselor_id')
    .eq('id', clientId)
    .single()

  if (client?.counselor_id) {
    try {
      await fetch(`${getBaseUrl()}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'escalation_alert',
          clientId,
          counselorId: client.counselor_id,
        }),
      })
    } catch (err) {
      console.error('Escalation email failed (non-fatal):', err)
    }
  }

  return NextResponse.json({ success: true, escalationId: escalation.id })
}
