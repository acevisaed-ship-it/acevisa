import { createAdminClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

const PIPELINE_STAGES: Record<number, string> = {
  1: 'New Lead',
  2: 'Qualified',
  3: 'Registered Client',
  4: 'Documents in Progress',
  5: 'Application Submitted',
  6: 'Visa Outcome',
  7: 'Alumni',
}

export async function POST(request: Request) {
  const { message, clientId, conversationHistory } = await request.json()

  if (!message || !clientId) {
    return NextResponse.json({ error: 'Missing message or clientId' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch full student context in parallel
  const [
    { data: client },
    { data: aiProfile },
    { data: conversations },
    { data: documents },
    { data: meetings },
    { data: escalations },
    { data: kb },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single(),
    supabase.from('ai_profiles').select('*').eq('client_id', clientId).maybeSingle(),
    supabase
      .from('conversations')
      .select('sender, message_text, timestamp')
      .eq('client_id', clientId)
      .order('timestamp', { ascending: false })
      .limit(50),
    supabase.from('documents').select('document_name, status').eq('client_id', clientId),
    supabase
      .from('meetings')
      .select('scheduled_time, status')
      .eq('client_id', clientId)
      .order('scheduled_time', { ascending: false })
      .limit(10),
    supabase.from('escalations').select('question_text, status, counselor_response, created_at').eq('client_id', clientId),
    supabase.from('knowledge_base').select('category, topic, answer').eq('is_active', true),
  ])

  // Build context strings
  const chatHistory = (conversations ?? [])
    .reverse()
    .map((c) => `[${c.sender === 'student' ? 'STUDENT' : 'AI COUNSELOR'}]: ${c.message_text}`)
    .join('\n') || 'No chat history yet.'

  const docsContext = (documents ?? []).length
    ? (documents ?? []).map((d) => `  • ${d.document_name}: ${d.status}`).join('\n')
    : '  None requested yet.'

  const meetingsContext = (meetings ?? []).length
    ? (meetings ?? []).map((m) => `  • ${new Date(m.scheduled_time).toLocaleDateString('en-PK')} [${m.status}]`).join('\n')
    : '  No meetings yet.'

  const complaintsContext = (escalations ?? []).length
    ? (escalations ?? []).map((e) => `  • "${e.question_text}" — Status: ${e.status}${e.counselor_response ? `\n    Response: ${e.counselor_response}` : ''}`).join('\n')
    : '  None.'

  const kbContext = (kb ?? []).map((k) => `[${k.category}] ${k.topic}: ${k.answer}`).join('\n') || 'Empty'

  const systemPrompt = `You are the ACE Altius Strategy Intelligence Engine — a powerful AI built into the counselor's private dashboard. You operate in two distinct modes:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODE 1 — CASE INTELLIGENCE (analysis)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When the counselor asks a question about the student or case, provide sharp, specific, context-aware insight. Draw on the student's full profile, psychology, chat history, documents, hesitations, and financial signals. Be direct. Counselors are busy — get to the point.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODE 2 — OBJECTIVE SETTING (objective_set)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When the counselor gives an objective — e.g. "get him to pay the processing fee", "convince her distance isn't a barrier", "make him commit to submitting documents this week" — extract and store it as a structured objective that the student-facing AI will pursue autonomously over the coming conversation.

You do NOT draft a message to send. Instead:
1. Extract the core objective as a concise one-liner (objectiveText)
2. Write a 2–3 sentence strategic plan for how the AI should pursue it through natural conversation (planText) — use psychology: value framing, social proof, loss aversion, urgency, reciprocity, commitment escalation, anchoring
3. Confirm to the counselor what has been set and why the plan will work

The student AI will pick up this objective from the database and pursue it organically — the student will never know the counselor set a goal.

Trigger MODE 2 when the counselor's message contains action-oriented language: "get", "make", "convince", "push", "encourage", "have the student", "ask student to", "persuade", "remind", "tell", "let them know", or describes a desired student behaviour/action.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT — ALWAYS use this exact JSON:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "type": "analysis" or "objective_set",
  "analysis": "Your counselor-facing insight or confirmation",
  "objectiveText": "Concise one-line version of the objective to store (objective_set only)",
  "planText": "2–3 sentence strategic plan for how the AI will pursue this objective through conversation (objective_set only)"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLIENT PROFILE:
  Name: ${client?.name ?? 'Unknown'}
  Pipeline Stage: ${PIPELINE_STAGES[client?.pipeline_stage ?? 1] ?? 'Unknown'} (Stage ${client?.pipeline_stage ?? 1})
  City: ${client?.city ?? 'Unknown'}
  Age: ${client?.age ?? 'Unknown'}
  Phone: ${client?.phone ?? 'Unknown'}
  Email: ${client?.email ?? 'Unknown'}
  Target Country: ${client?.target_country ?? 'Unknown'}
  Interested In: ${client?.interested_in ?? 'Unknown'}
  Last Education: ${client?.last_education ?? 'Unknown'}
  Education Percentage: ${client?.education_percentage ?? 'Unknown'}
  Completion Year: ${client?.education_completion_year ?? 'Unknown'}
  Budget: ${client?.budget ?? 'Unknown'}
  Travel History: ${JSON.stringify(client?.travel_history ?? [])}
  Visa Rejections: ${JSON.stringify(client?.visa_rejection_history ?? [])}
  Language Test Scores: ${JSON.stringify(client?.language_test_scores ?? [])}
  Registration Date: ${client?.registration_date ?? 'Unknown'}

AI PSYCHOLOGICAL PROFILE:
${aiProfile?.profile_json ? JSON.stringify(aiProfile.profile_json, null, 2) : '  Not yet generated.'}

BEHAVIOURAL SIGNALS:
  Detected Fears: ${aiProfile?.detected_fears ?? 'Unknown'}
  Behaviour Type: ${aiProfile?.detected_behaviour_type ?? 'Unknown'}
  Language/Dialect: ${aiProfile?.detected_language ?? 'Unknown'}
  Region: ${aiProfile?.detected_region ?? 'Unknown'}
  Qualification Score: ${aiProfile?.qualification_score ?? 'Unknown'}
  Service Match: ${aiProfile?.service_match ?? 'Unknown'}

DOCUMENTS STATUS:
${docsContext}

MEETINGS HISTORY:
${meetingsContext}

COMPLAINTS / ESCALATIONS:
${complaintsContext}

FULL CHAT HISTORY (last 50 messages, chronological):
${chatHistory}

ACE KNOWLEDGE BASE:
${kbContext}`

  const messages = [
    ...(conversationHistory ?? []),
    { role: 'user' as const, content: message },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages,
  })

  const rawContent = response.content[0].type === 'text' ? response.content[0].text : '{}'

  // Parse structured JSON response
  let parsed: {
    type: string
    analysis: string
    objectiveText?: string | null
    planText?: string | null
  } = {
    type: 'analysis',
    analysis: rawContent,
  }

  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0])
    }
  } catch {
    parsed = { type: 'analysis', analysis: rawContent }
  }

  // If objective was set, store it in the DB
  let savedObjectiveId: string | null = null
  if (parsed.type === 'objective_set' && parsed.objectiveText) {
    const { data: obj } = await supabase
      .from('counselor_objectives')
      .insert({
        client_id: clientId,
        objective_text: parsed.objectiveText,
        plan_text: parsed.planText ?? null,
      })
      .select('id')
      .single()
    savedObjectiveId = obj?.id ?? null
  }

  return NextResponse.json({ ...parsed, objectiveId: savedObjectiveId })
}
