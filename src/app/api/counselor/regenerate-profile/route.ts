import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { POST_CONVERSATION_PROFILE_PROMPT } from '@/lib/acePrompts'
import { closeMilestoneTasksForStage } from '@/lib/tasks/closeMilestoneTasks'

export async function POST(request: Request) {
  const { clientId } = await request.json()
  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch conversation history
  const { data: history, error: histErr } = await supabase
    .from('conversations')
    .select('sender, message_text, timestamp')
    .eq('client_id', clientId)
    .order('timestamp', { ascending: true })
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

  // Sender values in DB: 'student' | 'ai' | 'counselor'
  // Anthropic requires: messages must start with 'user' and alternate roles.
  // We merge consecutive same-role messages and skip leading assistant messages.
  const rawMessages = history.map((msg) => ({
    role: msg.sender === 'student' ? ('user' as const) : ('assistant' as const),
    content: msg.message_text,
  }))

  // Merge consecutive same-role messages into one
  const merged: Array<{ role: 'user' | 'assistant'; content: string }> = []
  for (const msg of rawMessages) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1].content += '\n' + msg.content
    } else {
      merged.push({ ...msg })
    }
  }

  // Anthropic requires first message to be 'user'
  while (merged.length > 0 && merged[0].role === 'assistant') {
    merged.shift()
  }

  if (merged.length === 0) {
    return NextResponse.json({ error: 'No client messages found in conversation' }, { status: 404 })
  }

  const conversationMessages = merged

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

    // AI prompt returns 'behaviour_type' (not 'detected_behaviour_type')
    const behaviourType =
      (profile.behaviour_type as string) ??
      (profile.detected_behaviour_type as string) ??
      existingProfile?.detected_behaviour_type ??
      null

    const { error: upsertErr } = await supabase.from('ai_profiles').upsert(
      {
        client_id: clientId,
        profile_json: profile,
        generated_at: new Date().toISOString(),
        stage: existingProfile?.stage ?? null,
        qualification_score: score,
        detected_language:
          (profile.detected_language as string) ?? existingProfile?.detected_language ?? null,
        detected_region:
          (profile.detected_region as string) ?? existingProfile?.detected_region ?? null,
        detected_fears:
          (profile.detected_fears as string[]) ?? existingProfile?.detected_fears ?? [],
        detected_behaviour_type: behaviourType,
        service_match:
          (profile.recommended_service_pathway as string) ??
          (profile.service_match as string) ??
          existingProfile?.service_match ??
          null,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'client_id' }
    )

    if (upsertErr) {
      console.error('[regenerate-profile] upsert failed:', upsertErr)
      return NextResponse.json({ error: `DB save failed: ${upsertErr.message}` }, { status: 500 })
    }

    const newStage = score >= 7 ? 2 : 1
    const { data: existingClient } = await supabase
      .from('clients')
      .select('pipeline_stage')
      .eq('id', clientId)
      .maybeSingle()
    await supabase
      .from('clients')
      .update({ qualification_score: score, pipeline_stage: newStage })
      .eq('id', clientId)
    await closeMilestoneTasksForStage(supabase, clientId, newStage, existingClient?.pipeline_stage)

    return NextResponse.json({ success: true, score })
  } catch (err) {
    console.error('[regenerate-profile] failed:', err)
    return NextResponse.json({ error: 'Profile generation failed' }, { status: 500 })
  }
}
