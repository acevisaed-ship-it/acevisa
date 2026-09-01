import { logStaffActivity } from '@/lib/activityLog'
import { requireCeoApi } from '@/lib/admin/requireAdminApi'
import { createNotification } from '@/lib/notifications'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/agent-drafts/[id] — CEO sign-off on a CEO-Agent-proposed task.
// Approving is the only path that actually creates a real task and notifies
// the target counselor; both outcomes are logged so agent activity is never
// invisible. Mirrors PATCH /api/stage-suggestions/[id].
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, error } = await requireCeoApi()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { status } = body as { status?: 'approved' | 'rejected' }

  if (!status || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Missing or invalid status' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: draft } = await supabase
    .from('agent_task_drafts')
    .select('id, draft_type, target_counselor_id, client_id, title, body, source_rule, status')
    .eq('id', id)
    .single()

  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }
  if (draft.status !== 'pending') {
    return NextResponse.json({ error: 'Draft already reviewed' }, { status: 400 })
  }

  if (status === 'approved') {
    // Only draft_type 'task' is materialized for now — the type exists so
    // future playbook rules can add other kinds without a schema change,
    // but each new kind needs its own approval-time handling added here.
    if (draft.draft_type === 'task') {
      // No target means "for the CEO's own attention" — assign the real
      // task to the approving CEO so it actually shows up somewhere
      // (My Tasks), rather than a null-owner task nobody ever sees.
      const assigneeId = draft.target_counselor_id || admin.id
      const { error: insertError } = await supabase.from('tasks').insert({
        counselor_id: assigneeId,
        client_id: draft.client_id,
        task_text: draft.body,
        status: 'open',
        source: 'ceo_agent',
      })
      if (insertError) {
        console.error('[agent-drafts PATCH] task insert failed:', insertError.message)
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
      }
      // Only notify when it's actually going to someone else — the CEO
      // doesn't need a notification for a task they just assigned themselves.
      if (draft.target_counselor_id) {
        await createNotification({
          counselorId: draft.target_counselor_id,
          type: 'task_assigned',
          title: 'New task from the CEO',
          body: draft.body,
          ...(draft.client_id ? { clientId: draft.client_id } : {}),
        })
      }
    }

    await logStaffActivity({
      counselorId: admin.id,
      actorRole: admin.role,
      actionType: 'agent_draft_approved',
      description: `${admin.name} approved a CEO Agent draft: "${draft.title}" (rule: ${draft.source_rule})`,
      metadata: { draftId: id, sourceRule: draft.source_rule, targetCounselorId: draft.target_counselor_id },
    })
  } else {
    await logStaffActivity({
      counselorId: admin.id,
      actorRole: admin.role,
      actionType: 'agent_draft_rejected',
      description: `${admin.name} rejected a CEO Agent draft: "${draft.title}" (rule: ${draft.source_rule})`,
      metadata: { draftId: id, sourceRule: draft.source_rule, targetCounselorId: draft.target_counselor_id },
    })
  }

  const { error: updateError } = await supabase
    .from('agent_task_drafts')
    .update({ status, reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 })
  }

  return NextResponse.json({ success: true, status })
}
