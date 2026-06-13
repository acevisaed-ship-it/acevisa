import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'

const client = new Anthropic()

export type PsychologicalRead = {
  personality_type: string
  communication_style: string
  emotional_state: string
  trust_level: string
  decision_making: string
}

export type BehavioralAnalysisResult = {
  psychological_read: PsychologicalRead
  behavioral_observations: string[]
  delta_from_last: string
  risk_flags: string[]
}

const SYSTEM_PROMPT = `You are an expert behavioral analyst for a visa and overseas education consultancy.
Analyse the provided chat history between the AI assistant and a client.
Return structured JSON ONLY — no markdown, no explanation, just valid JSON.

Output format:
{
  "psychological_read": {
    "personality_type": "string — e.g. anxious detail-seeker, confident decision-maker",
    "communication_style": "string — e.g. formal, casual, terse, verbose",
    "emotional_state": "string — e.g. hopeful, frustrated, uncertain",
    "trust_level": "string — e.g. low/building/established",
    "decision_making": "string — e.g. analytical, impulsive, needs reassurance"
  },
  "behavioral_observations": ["array", "of", "specific", "observations"],
  "delta_from_last": "string — what changed vs previous session, or 'First analysis' if none",
  "risk_flags": ["array", "of", "concerns", "or", "red flags"]
}`

export async function runBehavioralAnalysis(
  clientId: string,
  forceRun = false
): Promise<{ ran: boolean; reason?: string }> {
  const supabase = createAdminClient()

  // Fetch all messages for this client
  const { data: messages } = await supabase
    .from('conversations')
    .select('sender, message_text, timestamp')
    .eq('client_id', clientId)
    .order('timestamp', { ascending: true })

  if (!messages || messages.length === 0) {
    return { ran: false, reason: 'no messages' }
  }

  // Get the last analysis for this client
  const { data: lastAnalysis } = await supabase
    .from('ai_behavioral_notes')
    .select('id, message_count, psychological_read, behavioral_observations')
    .eq('client_id', clientId)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastCount = lastAnalysis?.message_count ?? 0
  const newMessageCount = messages.length
  const messagesSinceLast = newMessageCount - lastCount

  // Only run if 5+ new messages (or forced)
  if (!forceRun && messagesSinceLast < 5) {
    return { ran: false, reason: `only ${messagesSinceLast} new messages` }
  }

  // Build context for Claude
  const chatHistory = messages
    .map((m) => `[${m.sender === 'ai' ? 'AI' : 'Client'}]: ${m.message_text}`)
    .join('\n')

  const previousContext = lastAnalysis
    ? `\n\nPREVIOUS ANALYSIS (for delta comparison):\nPersonality: ${(lastAnalysis.psychological_read as PsychologicalRead)?.personality_type ?? 'unknown'}\nObservations: ${(lastAnalysis.behavioral_observations as string[] ?? []).join('; ')}`
    : '\n\nNo previous analysis — this is the first run.'

  const userMessage = `CLIENT CHAT HISTORY (${newMessageCount} messages, ${messagesSinceLast} new since last analysis):

${chatHistory}
${previousContext}

Analyse the full chat history and return JSON as specified.`

  let result: BehavioralAnalysisResult

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    result = JSON.parse(text) as BehavioralAnalysisResult
  } catch (err) {
    console.error('[behavioralAnalysis] Claude call failed:', err)
    return { ran: false, reason: 'claude error' }
  }

  // Fetch current AI profile snapshot
  const { data: aiProfile } = await supabase
    .from('ai_profiles')
    .select('profile_json')
    .eq('client_id', clientId)
    .maybeSingle()

  // Training data: input + output pair for fine-tuning
  const trainingData = {
    input: messages.map((m) => ({ role: m.sender === 'ai' ? 'assistant' : 'user', content: m.message_text })),
    output: result,
    client_id: clientId,
    analyzed_at: new Date().toISOString(),
  }

  // Store the analysis
  await supabase.from('ai_behavioral_notes').insert({
    client_id: clientId,
    message_count: newMessageCount,
    messages_since_last: messagesSinceLast,
    psychological_read: result.psychological_read,
    behavioral_observations: result.behavioral_observations,
    delta_from_last: result.delta_from_last,
    risk_flags: result.risk_flags,
    training_data: trainingData,
    profile_snapshot: aiProfile?.profile_json ?? null,
    model: 'claude-haiku-4-5-20251001',
  })

  return { ran: true }
}
