import { createAdminClient } from '@/lib/supabase/server'

export type AuditInput = {
  actorId?: string | null
  actorRole?: string | null
  branchId?: string | null
  entityType: string
  entityId?: string | null
  action: string
  before?: unknown
  after?: unknown
  reason?: string | null
}

/**
 * Append one row to audit_events (append-only; DB trigger blocks UPDATE/DELETE).
 * Call from every finance and HR write route. Never throws: a failed audit write is
 * logged and returned so the caller can decide whether to abort the money action.
 */
export async function writeAudit(input: AuditInput): Promise<{ error: string | null }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('audit_events').insert({
    actor_id: input.actorId ?? null,
    actor_role: input.actorRole ?? null,
    branch_id: input.branchId ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    before_data: input.before ?? null,
    after_data: input.after ?? null,
    reason: input.reason ?? null,
  })
  if (error) {
    console.error('[audit] insert failed:', error.message, input.entityType, input.action)
    return { error: error.message }
  }
  return { error: null }
}
