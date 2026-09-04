import type Anthropic from '@anthropic-ai/sdk'
import { requireCeoApi } from '@/lib/admin/requireAdminApi'
import { anthropic } from '@/lib/anthropic'
import { createAdminClient } from '@/lib/supabase/server'
import { CEO_AGENT_TOOLS, executeCeoAgentTool } from '@/lib/ceoAgentTools'
import { formatPKTDateLong } from '@/lib/pkt'
import { NextResponse } from 'next/server'

// POST /api/ceo-agent/chat — the CEO's direct-command chat assistant.
// Distinct from the autonomous daily review (agentDrafts.ts): that proposes
// drafts the CEO must approve; this executes tool calls immediately because
// the CEO issuing the command IS the approval. Runs a standard Anthropic
// tool-use loop: the model calls read tools (search/lookup the live
// portal data) as many times as it needs, then either answers in text or
// calls assign_task to actually create a task.
//
// Conversation history is kept client-side as plain {role, content: string}
// turns (mirrors src/app/api/counselor/strategy/route.ts) — intermediate
// tool_use/tool_result plumbing from a given turn is NOT persisted across
// turns, so a follow-up question always re-queries fresh data rather than
// risking a stale snapshot from a minute-old lookup.
const MAX_TOOL_ITERATIONS = 6
const MODEL = 'claude-sonnet-4-6'

function systemPrompt(ceoName: string) {
  return `You are the CEO's live portal assistant for ACE Altius Consulting, a study/visa consultancy. ${ceoName} is asking you questions about what's happening in the portal right now, or instructing you to assign work.

You have NO built-in knowledge of this agency's clients, staff, or cases — none of it was in your training data. Every fact you state about a specific person or case MUST come from a tool call in this conversation. Never invent or assume a name, id, count, or status.

Rules:
- To reference a specific client, ALWAYS call search_clients first (even if the CEO gives a full name) and use the returned clientId — never guess one.
- To reference or assign work to a specific counselor, ALWAYS call search_counselors first and use the returned counselorId — never guess one.
- If a search returns multiple plausible matches, list them for the CEO and ask which one they mean — do not pick one yourself.
- assign_task is a REAL, immediate action, not a draft — only call it once the CEO has clearly instructed a task be assigned to someone. After calling it, confirm in plain language exactly who it went to, what it says, and the due date (if any).
- Be concise and direct. Lead with the answer. The CEO is busy — no preamble like "I'll look that up," just look it up and answer.
- If a question is broad ("how's the team doing"), use list_all_counselors_summary and get_pipeline_overview rather than guessing scope.
- Today's date is ${formatPKTDateLong()} (PKT).`
}

export async function POST(request: Request) {
  const { admin, error } = await requireCeoApi()
  if (error) return error

  const body = await request.json().catch(() => ({}))
  const { message, conversationHistory } = body as {
    message?: string
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const ceo = { id: admin.id, name: admin.name, role: admin.role }

  const workingMessages: Anthropic.MessageParam[] = [
    ...(conversationHistory ?? []).map((t) => ({ role: t.role, content: t.content })),
    { role: 'user', content: message.trim() },
  ]

  const toolsUsed: Array<{ name: string; input: unknown }> = []
  let finalText = ''

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: systemPrompt(ceo.name),
        tools: CEO_AGENT_TOOLS,
        messages: workingMessages,
      })

      workingMessages.push({ role: 'assistant', content: response.content })

      if (response.stop_reason !== 'tool_use') {
        finalText = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim()
        break
      }

      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        toolsUsed.push({ name: block.name, input: block.input })
        let result: unknown
        try {
          result = await executeCeoAgentTool(block.name, block.input as Record<string, unknown>, supabase, ceo)
        } catch (err) {
          result = { error: err instanceof Error ? err.message : 'Tool failed' }
        }
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        })
      }
      workingMessages.push({ role: 'user', content: toolResultBlocks })
    }
  } catch (err) {
    console.error('[ceo-agent/chat] failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'The assistant hit an error — please try again.' }, { status: 500 })
  }

  if (!finalText) {
    finalText = "I wasn't able to finish that in time — try rephrasing or asking a narrower question."
  }

  return NextResponse.json({ reply: finalText, toolsUsed })
}
