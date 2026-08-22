import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/admin/clients/[clientId]/remove — admin/CEO only.
// Soft-delete: sets status = 'removed'. Never hard-deletes the row — deals,
// invoices, tasks, and activity_logs referencing this client must stay intact
// for financial and audit history. Removed clients disappear from Pipeline,
// All Clients, and counselor-panel views, but stay reachable by direct link.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { admin, error: authError } = await requireAdminApi()
  if (authError) return authError

  const { clientId } = await params
  const body = await request.json().catch(() => ({}))
  const { reason } = body as { reason?: string }

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, counselor_id, branch_id, status')
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  if (isBranchScopedAdmin(admin) && client.branch_id !== admin.branch_id) {
    return NextResponse.json({ error: 'Client not in your branch' }, { status: 403 })
  }

  if (client.status === 'removed') {
    return NextResponse.json({ success: true, alreadyRemoved: true })
  }

  const { error } = await supabase
    .from('clients')
    .update({
      status: 'removed',
      removed_at: new Date().toISOString(),
      removed_by: admin.id,
      removed_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) {
    console.error('[remove client] update failed:', error.message)
    return NextResponse.json({ error: 'Failed to remove client' }, { status: 500 })
  }

  await logActivity({
    clientId,
    counselorId: admin.id,
    actorRole: admin.role,
    actionType: 'client_removed',
    description: `Client removed by ${admin.role === 'ceo' ? 'CEO' : 'admin'}${reason ? `: ${reason}` : ''}`,
    metadata: { removedBy: admin.id, reason: reason || null },
  })

  if (client.counselor_id) {
    await createNotification({
      counselorId: client.counselor_id,
      type: 'client_removed',
      title: `Client removed — ${client.name}`,
      body: reason || 'Removed by admin/CEO.',
      clientId,
    })
  }

  return NextResponse.json({ success: true })
}
