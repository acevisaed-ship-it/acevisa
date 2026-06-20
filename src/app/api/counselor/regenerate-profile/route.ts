import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { POST_CONVERSATION_PROFILE_PROMPT } from '@/lib/acePrompts'

export async function POST(request: Request) {
  const { clientId } = await request.json()
  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch conversation history
  const { data: history, error: histErr } = await supabase
    .from('conversations')
    .select('sender, message_text, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
    .limit(80)

  if (histErr || !history?.length) {
    return NextResponse.json({ error: 'No conversation history found' }, { status: 404 })
  }

  // Get current internal profile data for fallback
  const { data: existingProfile } = await supabase
    .from('ai_profiles')
    .select('stage, qualification_score, detected_language, detected_region, detected_fears, detected_behaviour_type, service_match')
    .eq('client_id', clientId)
    .maybeSingle()

  const conversationMessages = history.map((msg) => ({
    role: msg.sender === 'client' ? ('user' as const) : ('assistant' as const),
    content: msg.message_text,
  }))

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: POST_CONVERSATION_PROFILE_PROMPT,
      messages: conversationMessages,
    })

    const rawContent =
      response.content[0].type === 'text' ? response.content[0].text : ''

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI did not return valid JSON profile' }, { status: 500 })
    }

    const profile = JSON.parse(jsonMatch[0]) as Record<string, unknown>
    const score =
      typeof profile.qualification_score === 'number'
        ? profile.qualification_score
        : existingProfile?.qualification_score ?? 0

    await supabase.from('ai_profiles').upsert(
      {
        client_id: clientId,
        profile_json: profile,
        generated_at: new Date().toISOString(),
        stage: existingProfile?.stage ?? null,
        qualification_score: score,
        detected_language:
          (profile.detected_language as string) ?? existingProfile?.detected_language,
        detected_region:
          (profile.detected_region as string) ?? existingProfile?.detected_region,
        detected_fears:
          (profile.detected_fears as string[]) ?? existingProfile?.detected_fears,
        detected_behaviour_type:
          (profile.detected_behaviour_type as string) ??
          existingProfile?.detected_behaviour_type,
        service_match:
          (profile.service_match as string) ?? existingProfile?.service_match,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'client_id' }
    )

    const newStage = score >= 7 ? 2 : 1
    await supabase
      .from('clients')
      .update({ qualification_score: score, pipeline_stage: newStage })
      .eq('id', clientId)

    return NextResponse.json({ success: true, score })
  } catch (err) {
    console.error('[regenerate-profile] failed:', err)
    return NextResponse.json({ error: 'Profile generation failed' }, { status: 500 })
  }
}
