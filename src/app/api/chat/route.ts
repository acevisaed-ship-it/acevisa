import { runBehavioralAnalysis } from '@/lib/behavioralAnalysis'
import { logActivity } from '@/lib/activityLog'
import {
  ACE_MASTER_SYSTEM_PROMPT,
  ACE_CONVERSATION_STYLE_RULES,
  POST_CONVERSATION_PROFILE_PROMPT,
  SPECIALIST_PROMPTS,
} from '@/lib/acePrompts'
import { ACE_KNOWLEDGE_BASE } from '@/lib/aceKnowledge'
import { anthropic, PROMPT_CACHE_BETA } from '@/lib/anthropic'
import {
  countFearSignals,
  detectTriggers,
  getLastStudentMessagesText,
  hasLegalSignal,
  type TriggerFlags,
} from '@/lib/detectTriggers'
import { hasMeetingIntent } from '@/lib/meetingIntent'
import { createNotification } from '@/lib/notifications'
import { detectProfileUpdates } from '@/lib/profileUpdates'
import { createAdminClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/utils'
import { NextResponse } from 'next/server'

const PIPELINE_STAGE_LABELS: Record<number, string> = {
  1: 'New Lead',
  2: 'Qualified',
  3: 'Registered Client',
  4: 'Documents in Progress',
  5: 'Application Submitted',
  6: 'Visa Outcome',
  7: 'Alumni',
}

function stageTagLabel(stageTag: string): string {
  if (stageTag === 'active') return 'AI assistant responded to client'
  if (stageTag === 'auto_booking') return 'AI booked a meeting automatically'
  if (stageTag === 'auto_reply') return 'AI sent auto-reply (counselor away)'
  const match = stageTag.match(/^stage_(\d+)$/)
  if (match) {
    const n = Number(match[1])
    const label = PIPELINE_STAGE_LABELS[n]
    return label ? `AI responded — ${label}` : `AI responded at stage ${n}`
  }
  return 'AI assistant responded'
}

const PANIC_KEYWORDS = [
  'kill myself',
  'want to die',
  'end my life',
  'suicide',
  'give up on life',
  'give up on everything',
  'want to give up',
  'giving up on everything',
  'threatening me',
  'being forced',
  'blackmail',
  'extortion',
  'already paid someone',
  'they took my money',
  'fake agent',
  'cheated me',
  'lost all my money',
  'paid and disappeared',
  'emergency visa',
  'deportation',
  'detained',
  'arrested',
]

type AceInternalState = {
  stage: number
  qualification_score: number
  detected_language: string
  detected_region: string
  detected_fears: string[]
  detected_behaviour_type: string
  service_match: string
  next_step_target: string
  escalation_needed: boolean
  escalation_type: string | null
}

type AceParsedResponse = {
  message: string
  internal: AceInternalState | null
}

function detectPanic(message: string): string[] {
  const lower = message.toLowerCase()
  return PANIC_KEYWORDS.filter((kw) => lower.includes(kw))
}

function parseAceResponse(rawContent: string): AceParsedResponse {
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { message: rawContent, internal: null }
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      message?: string
      internal?: Partial<AceInternalState>
    }

    if (!parsed.message) {
      return { message: rawContent, internal: null }
    }

    return {
      message: parsed.message,
      internal: parsed.internal
        ? {
            stage: parsed.internal.stage ?? 1,
            qualification_score: parsed.internal.qualification_score ?? 0,
            detected_language: parsed.internal.detected_language ?? 'unknown',
            detected_region: parsed.internal.detected_region ?? 'unknown',
            detected_fears: parsed.internal.detected_fears ?? [],
            detected_behaviour_type:
              parsed.internal.detected_behaviour_type ?? 'undecided',
            service_match: parsed.internal.service_match ?? 'unknown',
            next_step_target: parsed.internal.next_step_target ?? '',
            escalation_needed: parsed.internal.escalation_needed ?? false,
            escalation_type: parsed.internal.escalation_type ?? null,
          }
        : null,
    }
  } catch {
    return { message: rawContent, internal: null }
  }
}

async function completeResponseTracking(
  supabase: ReturnType<typeof createAdminClient>,
  trackingId: string | undefined,
  studentMsgTime: Date
) {
  if (!trackingId) return

  const responseAt = new Date()
  const secondsDiff = Math.floor(
    (responseAt.getTime() - studentMsgTime.getTime()) / 1000
  )

  await supabase
    .from('response_tracking')
    .update({
      response_at: responseAt.toISOString(),
      response_by: 'ai',
      response_time_seconds: secondsDiff,
    })
    .eq('id', trackingId)
}

function buildClientContext(client: {
  name: string
  city: string | null
  language: string
  ad_source: string | null
  pipeline_stage: number | null
  campaignContext: string
}): string {
  return `CLIENT: Name: ${client.name}, City: ${client.city || 'Not provided'}, Language: ${client.language}, Ad source: ${client.ad_source || 'direct'}, Stage: ${client.pipeline_stage || 1}
${client.campaignContext}`
}

function isConversationComplete(
  internal: AceInternalState | null,
  totalMessages: number
): boolean {
  if (!internal) return totalMessages >= 15

  return (
    (internal.qualification_score >= 7 && internal.stage === 4) ||
    totalMessages >= 15
  )
}

async function upsertInternalProfile(
  supabase: ReturnType<typeof createAdminClient>,
  clientId: string,
  internal: AceInternalState
) {
  const { error } = await supabase.from('ai_profiles').upsert(
    {
      client_id: clientId,
      stage: internal.stage,
      qualification_score: internal.qualification_score,
      detected_language: internal.detected_language,
      detected_region: internal.detected_region,
      detected_fears: internal.detected_fears,
      detected_behaviour_type: internal.detected_behaviour_type,
      service_match: internal.service_match,
      last_updated: new Date().toISOString(),
    },
    { onConflict: 'client_id' }
  )
  if (error) throw error
}

async function runSpecialistCalls(
  triggers: TriggerFlags,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  clientId: string
) {
  const supabase = createAdminClient()
  const activeSpecialists = (
    Object.entries(triggers) as Array<[keyof TriggerFlags, boolean]>
  ).filter(([, active]) => active)

  await Promise.all(
    activeSpecialists.map(async ([specialistType]) => {
      const systemPrompt = SPECIALIST_PROMPTS[specialistType]
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        system: systemPrompt,
        messages: conversationHistory,
      })

      const rawContent =
        response.content[0].type === 'text' ? response.content[0].text : ''

      let output: Record<string, unknown>
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
        output = jsonMatch
          ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>)
          : { raw: rawContent }
      } catch {
        output = { raw: rawContent }
      }

      await supabase.from('specialist_outputs').insert({
        client_id: clientId,
        specialist_type: specialistType,
        output,
      })
    })
  )
}

async function runPostConversationProfile(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  clientId: string,
  internal: AceInternalState | null
) {
  const supabase = createAdminClient()

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: POST_CONVERSATION_PROFILE_PROMPT,
    messages: conversationHistory,
  })

  const rawContent =
    response.content[0].type === 'text' ? response.content[0].text : ''

  const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return

  const profile = JSON.parse(jsonMatch[0]) as Record<string, unknown>
  const score =
    typeof profile.qualification_score === 'number'
      ? profile.qualification_score
      : internal?.qualification_score ?? 0

  await supabase.from('ai_profiles').upsert(
    {
      client_id: clientId,
      profile_json: profile,
      generated_at: new Date().toISOString(),
      stage: internal?.stage ?? null,
      qualification_score: score,
      detected_language:
        (profile.detected_language as string) ?? internal?.detected_language,
      detected_region:
        (profile.detected_region as string) ?? internal?.detected_region,
      detected_fears:
        (profile.detected_fears as string[]) ?? internal?.detected_fears,
      detected_behaviour_type:
        (profile.detected_behaviour_type as string) ??
        internal?.detected_behaviour_type,
      service_match:
        (profile.service_match as string) ?? internal?.service_match,
      last_updated: new Date().toISOString(),
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

export async function POST(request: Request) {
  const studentMsgTime = new Date()
  let trackingId: string | undefined

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
    .select(
      'name, language, city, qualification_score, counselor_id, ad_source, pipeline_stage, counselor_active'
    )
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // ── If counselor is live in chat, AI stays silent ──────────────────────
  if (!isInit && client.counselor_active) {
    return NextResponse.json({ type: 'counselor_active', content: null, message: null })
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
    const stageTag = 'stage_1'
    await supabase.from('conversations').insert({
      client_id: clientId,
      message_text: campaignOpeningLine,
      sender: 'ai',
      stage_tag: stageTag,
    })
    await logActivity({
      clientId,
      actionType: 'ai_message_sent',
      description: 'AI sent campaign opening message to client',
      metadata: { stage: stageTag },
    })
    return NextResponse.json({
      type: 'message',
      content: campaignOpeningLine,
      message: campaignOpeningLine,
    })
  }

  if (!isInit) {
    await supabase.from('conversations').insert({
      client_id: clientId,
      message_text: message,
      sender: 'student',
      stage_tag: 'active',
    })

    const { data: trackingRow } = await supabase
      .from('response_tracking')
      .insert({
        client_id: clientId,
        counselor_id: client.counselor_id || null,
        student_message_at: studentMsgTime.toISOString(),
      })
      .select('id')
      .single()

    trackingId = trackingRow?.id

    const triggeredKeywords = detectPanic(message)
    if (triggeredKeywords.length > 0) {
      const { data: panicEvent } = await supabase
        .from('panic_events')
        .insert({
          client_id: clientId,
          trigger_message: message,
          trigger_keywords: triggeredKeywords,
          status: 'open',
        })
        .select('id')
        .single()

      await logActivity({
        clientId,
        actionType: 'panic_detected',
        description: `Panic keywords detected in student message: ${triggeredKeywords.join(', ')}`,
        metadata: { keywords: triggeredKeywords, panicEventId: panicEvent?.id },
      })

      if (client.counselor_id) {
        await createNotification({
          counselorId: client.counselor_id,
          type: 'panic',
          title: `🚨 ${client.name} — urgent message detected`,
          body: `"${message.substring(0, 100)}${message.length > 100 ? '…' : ''}"`,
          clientId,
        })
      }

      const panicResponse =
        'I can see this is a very difficult situation. Please know that a real counselor from our team will reach out to you very shortly, we\'re treating this as a priority. If you are in immediate danger, please contact emergency services (15 in Pakistan). We are here for you.'

      await supabase.from('conversations').insert({
        client_id: clientId,
        message_text: panicResponse,
        sender: 'ai',
        stage_tag: 'panic_escalation',
      })

      await completeResponseTracking(supabase, trackingId, studentMsgTime)

      return NextResponse.json({
        type: 'message',
        content: panicResponse,
        message: panicResponse,
      })
    }

    if (hasMeetingIntent(message)) {
      try {
        const autoBookUrl = `${new URL(request.url).origin}/api/meetings/auto-book`
        const bookingResult = await fetch(autoBookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, message, client }),
        })
        const booking = await bookingResult.json()

        if (booking.handled) {
          const stageTag = 'auto_booking'
          await supabase.from('conversations').insert({
            client_id: clientId,
            message_text: booking.responseMessage,
            sender: 'ai',
            stage_tag: stageTag,
          })

          await logActivity({
            clientId,
            actionType: 'ai_message_sent',
            description: 'AI booked a meeting automatically',
            metadata: { stage: stageTag },
          })

          await completeResponseTracking(supabase, trackingId, studentMsgTime)

          return NextResponse.json({
            type: 'message',
            content: booking.responseMessage,
            message: booking.responseMessage,
          })
        }
      } catch {
        // Fall through to Claude on auto-book failure
      }
    }

    const proposedChanges = detectProfileUpdates(message)
    if (Object.keys(proposedChanges).length > 0) {
      await supabase.from('profile_update_requests').insert({
        client_id: clientId,
        triggered_by_message: message,
        proposed_changes: proposedChanges,
        status: 'pending',
      })

      await logActivity({
        clientId,
        actionType: 'profile_update_detected',
        description: `Profile update detected in chat: ${Object.keys(proposedChanges).join(', ')}`,
        metadata: { proposedChanges },
      })

      if (client.counselor_id) {
        await createNotification({
          counselorId: client.counselor_id,
          type: 'profile_update',
          title: `Profile update detected — ${client.name}`,
          body: `Student shared new info: ${Object.keys(proposedChanges).join(', ')}`,
          clientId,
        })
      }
    }
  }

  if (!isInit && client.counselor_id) {
    const { data: status } = await supabase
      .from('counselor_status')
      .select('is_online, auto_reply_enabled, auto_reply_message')
      .eq('counselor_id', client.counselor_id)
      .single()

    if (status?.is_online && status?.auto_reply_enabled) {
      const autoMsg =
        status.auto_reply_message || "I'll get back to you in a moment!"

      const stageTag = 'auto_reply'
      await supabase.from('conversations').insert({
        client_id: clientId,
        message_text: autoMsg,
        sender: 'ai',
        stage_tag: stageTag,
      })

      await logActivity({
        clientId,
        actionType: 'ai_message_sent',
        description: 'AI sent auto-reply (counselor is currently away)',
        metadata: { stage: stageTag },
      })

      await completeResponseTracking(supabase, trackingId, studentMsgTime)

      return NextResponse.json({
        type: 'message',
        content: autoMsg,
        message: autoMsg,
      })
    }
  }

  const { data: history } = await supabase
    .from('conversations')
    .select('message_text, sender, timestamp')
    .eq('client_id', clientId)
    .order('timestamp', { ascending: true })

  const { data: existingProfile } = await supabase
    .from('ai_profiles')
    .select('stage, detected_region, profile_json')
    .eq('client_id', clientId)
    .maybeSingle()

  const { data: activeObjectives } = await supabase
    .from('counselor_objectives')
    .select('objective_text, plan_text')
    .eq('client_id', clientId)
    .eq('status', 'active')

  const objectivesContext =
    activeObjectives && activeObjectives.length > 0
      ? `\nACTIVE COUNSELOR OBJECTIVES — pursue these naturally through conversation without ever stating them explicitly:\n${activeObjectives.map((o, i) => `${i + 1}. ${o.objective_text}${o.plan_text ? `\n   Strategy: ${o.plan_text}` : ''}`).join('\n')}`
      : ''

  const conversationMessages = isInit
    ? [{ role: 'user' as const, content: 'The student has just joined the chat.' }]
    : (history || []).map((msg) => ({
        role: msg.sender === 'student' ? ('user' as const) : ('assistant' as const),
        content: msg.message_text,
      }))

  const clientContext = buildClientContext({
    name: client.name,
    city: client.city,
    language: client.language,
    ad_source: client.ad_source,
    pipeline_stage: client.pipeline_stage,
    campaignContext,
  })

  const response = await anthropic.messages.create(
    {
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: [
        {
          // Block 1 — cached: master identity, psychology, compliance rules
          type: 'text',
          text: ACE_MASTER_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
        {
          // Block 2 — cached: conversation style rules
          type: 'text',
          text: ACE_CONVERSATION_STYLE_RULES,
          cache_control: { type: 'ephemeral' },
        },
        {
          // Block 3 — cached: knowledge base (products, countries, universities, fees)
          type: 'text',
          text: ACE_KNOWLEDGE_BASE,
          cache_control: { type: 'ephemeral' },
        },
        {
          // Block 4 — NOT cached: per-client dynamic context
          type: 'text',
          text: `${objectivesContext ? objectivesContext + '\n' : ''}${clientContext}`,
        },
      ],
      messages: conversationMessages,
    },
    {
      headers: {
        'anthropic-beta': PROMPT_CACHE_BETA,
      },
    }
  )

  const rawContent =
    response.content[0].type === 'text' ? response.content[0].text : ''

  const parsed = parseAceResponse(rawContent)
  const studentMessage = parsed.message
  const internal = parsed.internal

  const stageTag = internal ? `stage_${internal.stage}` : 'active'
  await supabase.from('conversations').insert({
    client_id: clientId,
    message_text: studentMessage,
    sender: 'ai',
    stage_tag: stageTag,
  })

  await logActivity({
    clientId,
    actionType: 'ai_message_sent',
    description: stageTagLabel(stageTag),
    metadata: { stage: stageTag },
  })

  if (internal) {
    try {
      await upsertInternalProfile(supabase, clientId, internal)

      await supabase
        .from('clients')
        .update({ qualification_score: internal.qualification_score })
        .eq('id', clientId)
    } catch (err) {
      console.error('[chat] ai_profiles upsert failed:', err)
    }
  }

  if (internal?.escalation_needed) {
    const last5 = (history || []).slice(-5)
    try {
      await fetch(`${getBaseUrl()}/api/escalation/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          questionText: message || internal.escalation_type || studentMessage,
          conversationContext: last5,
        }),
      })
    } catch {
      // Non-fatal escalation failure
    }
  }

  const totalMessages = (history || []).length + 1
  const conversationComplete = isConversationComplete(internal, totalMessages)
  const responseType = conversationComplete ? 'conversation_complete' : 'message'
  const score = internal?.qualification_score

  if (conversationComplete && internal && score !== undefined && score >= 7) {
    try {
      await supabase
        .from('clients')
        .update({ pipeline_stage: 2 })
        .eq('id', clientId)
    } catch {
      // Non-fatal pipeline update failure
    }
  }

  if (internal) {
    const studentText = getLastStudentMessagesText(conversationMessages)
    const fearCount = countFearSignals(studentText)
    const previousStage = existingProfile?.stage
    const stallCount =
      previousStage !== undefined &&
      previousStage !== null &&
      previousStage === internal.stage
        ? 3
        : 0
    const regionalLoaded =
      !!existingProfile?.detected_region &&
      existingProfile.detected_region !== 'unknown'
    const legalLoaded = (history || []).some((msg) =>
      hasLegalSignal(msg.message_text)
    )

    const triggers = detectTriggers(conversationMessages, {
      stage: internal.stage,
      fear_count: fearCount,
      stall_count: stallCount,
      regional_context_loaded: regionalLoaded,
      legal_context_loaded: legalLoaded,
      qualification_score: internal.qualification_score,
    })

    runSpecialistCalls(triggers, conversationMessages, clientId).catch(() => {})
  }

  // Auto-trigger behavioral analysis every 5th message (fire-and-forget)
  const totalMsgCount = (history || []).length + 2 // +2: student msg + this AI reply
  if (!isInit && totalMsgCount % 5 === 0) {
    runBehavioralAnalysis(clientId).catch(() => {})
  }

  const needsFullProfile =
    totalMessages >= 15 && !existingProfile?.profile_json

  if (conversationComplete || needsFullProfile) {
    runPostConversationProfile(conversationMessages, clientId, internal).catch(
      (err) => console.error('[chat] post-conversation profile failed:', err)
    )
  }

  if (!isInit) {
    await completeResponseTracking(supabase, trackingId, studentMsgTime)
  }

  return NextResponse.json({
    type: responseType,
    content: studentMessage,
    message: studentMessage,
    score: conversationComplete ? score : undefined,
  })
}
