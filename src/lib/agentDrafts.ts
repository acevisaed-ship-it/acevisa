import { createAdminClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

/**
 * Record a CEO-Agent-proposed task for CEO review — this is the ONLY thing
 * any playbook rule is allowed to do. Nothing here creates a real task,
 * assigns anyone, or notifies a counselor; that only happens once the CEO
 * approves the draft via PATCH /api/agent-drafts/[id]. Mirrors
 * suggestStageChange() / stage_suggestions (see src/lib/stageSuggestions.ts)
 * generalized to arbitrary staff-facing tasks.
 */
export async function draftTask({
  targetCounselorId,
  clientId,
  title,
  body,
  sourceRule,
  metadata,
  dedupeKey,
}: {
  targetCounselorId?: string | null
  clientId?: string | null
  title: string
  body: string
  sourceRule: string
  metadata?: Record<string, unknown>
  // Distinguishes multiple pending drafts from the same rule that would
  // otherwise look identical for de-duplication purposes — e.g. several
  // "review counselor X" drafts all aimed at the CEO (target_counselor_id
  // null for every one) need something other than target to tell them
  // apart, or only the first counselor flagged would ever get a draft.
  // Defaults to targetCounselorId, which is the right key when each target
  // IS the distinguishing factor (e.g. "draft a task assigned to counselor X").
  dedupeKey?: string | null
}) {
  const supabase = createAdminClient()
  const key = dedupeKey !== undefined ? (dedupeKey ?? '') : (targetCounselorId ?? '')

  // Avoid piling up duplicate pending drafts from the same rule with the
  // same dedupe key — a playbook rule that runs daily shouldn't re-propose
  // something the CEO hasn't reviewed yet.
  const { data: existing } = await supabase
    .from('agent_task_drafts')
    .select('id')
    .eq('status', 'pending')
    .eq('source_rule', sourceRule)
    .eq('metadata->>dedupeKey', key)
    .maybeSingle()

  if (existing) return { created: false, id: existing.id }

  const { data, error } = await supabase
    .from('agent_task_drafts')
    .insert({
      target_counselor_id: targetCounselorId || null,
      client_id: clientId || null,
      title,
      body,
      source_rule: sourceRule,
      metadata: { ...(metadata ?? {}), dedupeKey: key },
    })
    .select('id')
    .single()

  if (error) {
    console.error('[agentDrafts] insert failed:', error.message)
    return { created: false, id: null }
  }

  // Notify every CEO account so the review queue doesn't go unnoticed.
  const { data: ceos } = await supabase.from('counselors').select('id').eq('role', 'ceo')
  for (const ceo of ceos ?? []) {
    await createNotification({
      counselorId: ceo.id,
      type: 'agent_draft',
      title: `CEO Agent: ${title}`,
      body,
    })
  }

  return { created: true, id: data.id }
}

/** Whether the CEO Agent's autonomous daily review is currently switched on. */
export async function isCeoAgentEnabled(): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('agent_settings')
    .select('enabled')
    .eq('id', 'ceo_agent')
    .maybeSingle()
  return data?.enabled ?? false
}
