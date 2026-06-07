import { createAdminClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { message, clientId, conversationHistory } = await request.json()

  if (!message || !clientId) {
    return NextResponse.json({ error: 'Missing message or clientId' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: kb } = await supabase
    .from('knowledge_base')
    .select('category, topic, answer')
    .eq('is_active', true)

  const kbContext =
    kb?.map((k) => `[${k.category}] ${k.topic}: ${k.answer}`).join('\n') || 'Empty'

  const { data: profile } = await supabase
    .from('ai_profiles')
    .select('profile_json')
    .eq('client_id', clientId)
    .single()

  const systemPrompt = `You are a knowledgeable education and immigration strategy assistant for the counselors at AceVisa. You support counselors before and after client meetings with strategic advice, objection handling, and case planning.

You answer from the company knowledge base only. If the answer is not in the knowledge base, say: "This topic is not yet in the knowledge base. I recommend verifying with the official source and then adding it so the team has it for future cases."

Always end answers about visa rules or specific requirements with: "Please verify this against the latest official guidelines before advising your client, as requirements change frequently."

You never contact students directly. You are a back-office advisor only.
Be concise and practical. Counselors are busy. Get to the point.

KNOWLEDGE BASE:
${kbContext}

CLIENT PROFILE:
${profile ? JSON.stringify(profile.profile_json, null, 2) : 'No profile generated yet'}`

  const messages = [
    ...(conversationHistory || []),
    { role: 'user' as const, content: message },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const content =
    response.content[0].type === 'text' ? response.content[0].text : ''

  return NextResponse.json({ content })
}
