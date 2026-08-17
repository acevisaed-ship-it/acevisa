import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import {
  applyCorrectableChanges,
  findDuplicateClients,
  isCorrectableField,
  loadClientForm,
  type ProposedChanges,
} from '@/lib/receptionist/clientForm'
import { logActivity } from '@/lib/activityLog'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError
  if (!receptionist.branch_id) {
    return NextResponse.json({ error: 'Receptionist is not assigned to a branch' }, { status: 400 })
  }

  const { id } = await params
  const body = (await request.json()) as { values?: Record<string, string> }
  const supabase = createAdminClient()

  const { data: row, error: fetchError } = await supabase
    .from('client_correction_requests')
    .select('*')
    .eq('id', id)
    .eq('branch_id', receptionist.branch_id)
    .maybeSingle()

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Correction request not found' }, { status: 404 })
  }

  if (row.status !== 'approved') {
    return NextResponse.json(
      { error: 'This request must be approved by an admin or CEO before you can change the information.' },
      { status: 403 }
    )
  }

  const client = await loadClientForm(supabase, {
    clientId: row.client_id as string,
    branchId: receptionist.branch_id,
  })
  if (!client) {
    return NextResponse.json({ error: 'Client not found in your branch' }, { status: 404 })
  }

  const approved = (row.proposed_changes ?? {}) as Record<string, string>
  const approvedFields = Object.keys(approved).filter(isCorrectableField)
  if (approvedFields.length === 0) {
    return NextResponse.json({ error: 'No approved fields to apply' }, { status: 400 })
  }

  const changes: ProposedChanges = {}
  for (const field of approvedFields) {
    const incoming = body.values && typeof body.values[field] === 'string'
      ? body.values[field]
      : approved[field]
    changes[field] = incoming ?? ''
  }

  const duplicates = await findDuplicateClients(supabase, {
    branchId: receptionist.branch_id,
    excludeClientId: client.id,
    name: changes.name ?? client.name,
    phone: changes.phone ?? client.phone,
    email: changes.email ?? client.email,
  })

  const result = await applyCorrectableChanges(supabase, {
    clientId: client.id,
    changes,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, duplicates },
      { status: result.status }
    )
  }

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('client_correction_requests')
    .update({
      status: 'applied',
      applied_at: now,
      applied_values: changes,
      updated_at: now,
    })
    .eq('id', id)

  if (updateError) {
    console.error('[receptionist/correction-requests/apply] status update failed:', updateError.message)
  }

  await logActivity({
    clientId: client.id,
    counselorId: receptionist.id,
    actorRole: 'receptionist',
    actionType: 'correction_applied',
    description: `${receptionist.name} applied approved information changes for ${client.name}`,
    metadata: { requestId: id, fields: Object.keys(changes) },
  })

  return NextResponse.json({ success: true, duplicates })
}
