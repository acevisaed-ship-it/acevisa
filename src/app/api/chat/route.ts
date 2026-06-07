import { createAdminClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { getBaseUrl } from '@/lib/utils'
import { NextResponse } from 'next/server'
import type { AIProfileData } from '@/types'

type ChatResponse = {
  type: string
  content: string
  question?: string
  profile?: AIProfileData
}

function buildSystemPrompt(
  client: { name: string; language: string },
  kbContext: string,
  campaignContext: string
): string {
  return `You are a warm, knowledgeable overseas education counselor working for AceVisa, a Pakistan-based consultancy specialising in international university admissions and visa processing. You are speaking with a prospective student or their family member who has just registered on the portal.

Your goal is to understand their situation fully, help them feel heard and informed, and determine whether they are genuinely ready to proceed with their overseas education journey. You are not selling. You are advising.

CONVERSATION RULES:
- Ask one or two questions at a time maximum. Never a list of questions.
- Respond in the language the student chose at registration: ${client.language}. If they switch languages mid-conversation, switch with them.
- Be warm, patient, and genuinely helpful. Never pushy.
- Listen to their story before asking structured questions.

KNOWLEDGE BASE — THIS HAS NO EXCEPTIONS:
For any factual question about visa requirements, document requirements, fees, processing times, university requirements, or service details — search the knowledge base first. Answer ONLY from what is in the knowledge base below. If the answer is not there, respond with exactly: "That is an important detail — I want to make sure you get the most accurate answer rather than a guess. I have flagged this for your counselor who will respond to you directly." Then return the JSON action flag_escalation.

KNOWLEDGE BASE:
${kbContext}
${campaignContext}

CONVERSATION STAGES:
Stage 1 — Welcome and intent (2-3 exchanges): Greet by name (${client.name}), ask what brings them here, listen.
Stage 2 — Goal profiling (3-5 exchanges): Desired country, field of study, start date, education level.
Stage 3 — Practical profiling (3-5 exchanges): English test status, budget type, passport status, prior visa refusals.
Stage 4 — Concern surfacing (2-3 exchanges): Biggest worry, what has stopped them before, family involvement.
Stage 5 — Wrap up: Thank them, explain a counselor will personally review their case.

RESPONSE FORMAT:
You must always respond with valid JSON in one of these three formats:

1. Normal message:
{"type": "message", "content": "your message to the student"}

2. Escalation needed:
{"type": "flag_escalation", "content": "That is an important detail — I want to make sure you get the most accurate answer rather than a guess. I have flagged this for your counselor who will respond to you directly.", "question": "the exact question that needs counselor input"}

3. Conversation complete (only after Stage 5 wrap up):
{"type": "conversation_complete", "content": "your final wrap up message", "profile": {"goal_country": "", "study_field": "", "start_date": "", "education_level": "", "english_test_status": "", "budget_type": "", "has_passport": false, "visa_refusals": false, "main_concern": "", "family_involvement": "", "qualification_score": 0, "score_rationale": "", "recommended_service_pathway": "", "psychological_notes": [], "suggested_talking_points": []}}

QUALIFICATION SCORING (internal, never share with student):
Score 7-10: Clear goal, realistic budget awareness, no major blockers, asking specific process questions.
Score 4-6: Interested but vague, early research stage, budget unclear.
Score 1-3: Just browsing, no timeline, no commitment signals.`
}

function parseClaudeResponse(rawContent: string): ChatResponse {
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    return jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { type: 'message', content: rawContent }
  } catch {
    return { type: 'message', content: rawContent }
  }
}

export async function POST(request: Request) {
  const { clientId, message } = await request.json()

  if (!clientId || !message) {
    return NextResponse.json(
      { error: 'Missing clientId or message' },
      { status: 400 }
    )
  }

  const isInit = message === '__init__'
  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('name, language, qualification_score, counselor_id, ad_source')
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  let campaignContext = ''
  let campaignOpeningLine = ''

  if (client.ad_source && client.ad_source !== 'direct') {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('opening_line, context_hint, target_country, target_service, campaign_name')
      .eq('ad_source_code', client.ad_source)
      .eq('is_active', true)
      .maybeSingle()

    if (campaign) {
      campaignOpeningLine = campaign.opening_line.replace('[name]', client.name)
      campaignContext = `
CAMPAIGN CONTEXT:
This student came from the "${campaign.campaign_name}" campaign.
Target country: ${campaign.target_country || 'Not specified'}
Target service: ${campaign.target_service || 'Not specified'}
Counselor hint: ${campaign.context_hint}
Use this context to make your opening message highly relevant to their specific interest.`
    }
  }

  if (isInit && campaignOpeningLine) {
    await supabase.from('conversations').insert({
      client_id: clientId,
      message_text: campaignOpeningLine,
      sender: 'ai',
      stage_tag: 'stage_1',
    })
    return NextResponse.json({ type: 'message', content: campaignOpeningLine })
  }

  if (!isInit && client.counselor_id) {
    const { data: status } = await supabase
      .from('counselor_status')
      .select('is_online, auto_reply_enabled, auto_reply_message')
      .eq('counselor_id', client.counselor_id)
      .single()

    if (status?.is_online && status?.auto_reply_enabled) {
      await supabase.from('conversations').insert({
        client_id: clientId,
        message_text: message,
        sender: 'student',
        stage_tag: 'active',
      })

      const autoMsg =
        status.auto_reply_message || "I'll get back to you in a moment!"

      await supabase.from('conversations').insert({
        client_id: clientId,
        message_text: autoMsg,
        sender: 'ai',
        stage_tag: 'auto_reply',
      })

      return NextResponse.json({ type: 'message', content: autoMsg })
    }
  }

  if (!isInit) {
    await supabase.from('conversations').insert({
      client_id: clientId,
      message_text: message,
      sender: 'student',
      stage_tag: 'active',
    })
  }

  const { data: history } = await supabase
    .from('conversations')
    .select('message_text, sender, timestamp')
    .eq('client_id', clientId)
    .order('timestamp', { ascending: true })

  const { data: knowledgeBase } = await supabase
    .from('knowledge_base')
    .select('category, topic, answer')
    .eq('is_active', true)

  const kbContext =
    knowledgeBase && knowledgeBase.length > 0
      ? knowledgeBase
          .map((kb) => `[${kb.category}] ${kb.topic}: ${kb.answer}`)
          .join('\n')
      : 'Knowledge base is currently empty.'

  const conversationMessages = isInit
    ? [{ role: 'user' as const, content: 'The student has just joined the chat.' }]
    : (history || []).map((msg) => ({
        role: msg.sender === 'student' ? ('user' as const) : ('assistant' as const),
        content: msg.message_text,
      }))

  const systemPrompt = buildSystemPrompt(client, kbContext, campaignContext)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversationMessages,
  })

  const rawContent =
    response.content[0].type === 'text' ? response.content[0].text : ''

  const parsed = parseClaudeResponse(rawContent)

  await supabase.from('conversations').insert({
    client_id: clientId,
    message_text: parsed.content,
    sender: 'ai',
    stage_tag: 'active',
  })

  if (parsed.type === 'flag_escalation' && parsed.question) {
    const last5 = (history || []).slice(-5)
    try {
      await fetch(`${getBaseUrl()}/api/escalation/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          questionText: parsed.question,
          conversationContext: last5,
        }),
      })
    } catch (err) {
      console.error('Escalation create failed (non-fatal):', err)
    }
  }

  if (parsed.type === 'conversation_complete' && parsed.profile) {
    const profile = parsed.profile
    const score = profile.qualification_score || 0

    await supabase.from('ai_profiles').upsert(
      {
        client_id: clientId,
        profile_json: profile,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id' }
    )

    const newStage = score >= 7 ? 2 : 1
    await supabase
      .from('clients')
      .update({
        qualification_score: score,
        pipeline_stage: newStage,
      })
      .eq('id', clientId)
  }

  return NextResponse.json({
    type: parsed.type,
    content: parsed.content,
    score:
      parsed.type === 'conversation_complete'
        ? parsed.profile?.qualification_score
        : undefined,
  })
}
