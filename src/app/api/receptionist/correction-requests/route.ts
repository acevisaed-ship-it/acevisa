import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import {
  CORRECTABLE_FIELDS,
  diffProposedChanges,
  findDuplicateClients,
  isCorrectableField,
  loadClientForm,
  snapshotValues,
  type ProposedChanges,
} from '@/lib/receptionist/clientForm'
import { logActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError
  if (!receptionist.branch_id) {
    return NextResponse.json({ error: 'Receptionist is not assigned to a branch' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('client_correction_requests')
    .select('*, clients(name, client_code, phone)')
    .eq('branch_id', receptionist.branch_id)
    .in('status', ['pending', 'approved', 'rejected', 'applied'])
    .order('created_at', { ascending: false })
    .limit(40)

  if (error) {
    console.error('[receptionist/correction-requests] list failed:', error.message)
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 })
  }

  const requests = (data ?? []).map((row) => {
    const client = row.clients as { name: string; client_code: string; phone: string } | null
    return {
      id: row.id as string,
      clientId: row.client_id as string,
      clientName: client?.name ?? 'Unknown',
      clientCode: client?.client_code ?? '',
      currentValues: (row.current_values ?? {}) as Record<string, string>,
      proposedChanges: (row.proposed_changes ?? {}) as Record<string, string>,
      reason: (row.reason as string | null) ?? null,
      status: row.status as string,
      reviewNote: (row.review_note as string | null) ?? null,
      createdAt: row.created_at as string,
      reviewedAt: (row.reviewed_at as string | null) ?? null,
      appliedAt: (row.applied_at as string | null) ?? null,
    }
  })

  return NextResponse.json({ requests })
}

export async function POST(request: Request) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError
  if (!receptionist.branch_id) {
    return NextResponse.json({ error: 'Receptionist is not assigned to a branch' }, { status: 400 })
  }

  const body = (await request.json()) as {
    clientId?: string
    values?: Record<string, string>
    reason?: string
  }

  const clientId = body.clientId?.trim()
  if (!clientId || !body.values || typeof body.values !== 'object') {
    return NextResponse.json({ error: 'Client and updated fields are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const client = await loadClientForm(supabase, {
    clientId,
    branchId: receptionist.branch_id,
  })
  if (!client) {
    return NextResponse.json({ error: 'Client not found in your branch' }, { status: 404 })
  }

  const nextValues = {} as Record<(typeof CORRECTABLE_FIELDS)[number], string>
  const current = snapshotValues(client)
  for (const field of CORRECTABLE_FIELDS) {
    nextValues[field] = typeof body.values[field] === 'string' ? body.values[field] : current[field]
  }

  const proposedChanges = diffProposedChanges(current, nextValues)
  if (Object.keys(proposedChanges).length === 0) {
    return NextResponse.json({ error: 'No information was changed' }, { status: 400 })
  }

  const { data: openRequest } = await supabase
    .from('client_correction_requests')
    .select('id, status')
    .eq('client_id', clientId)
    .in('status', ['pending', 'approved'])
    .maybeSingle()

  if (openRequest) {
    return NextResponse.json(
      {
        error:
          openRequest.status === 'approved'
            ? 'This client already has an approved correction waiting to be applied.'
            : 'A correction request for this client is already pending approval.',
      },
      { status: 409 }
    )
  }

  const duplicates = await findDuplicateClients(supabase, {
    branchId: receptionist.branch_id,
    excludeClientId: client.id,
    name: proposedChanges.name ?? client.name,
    phone: proposedChanges.phone ?? client.phone,
    email: proposedChanges.email ?? client.email,
  })

  const { data: inserted, error } = await supabase
    .from('client_correction_requests')
    .insert({
      client_id: client.id,
      requested_by: receptionist.id,
      branch_id: receptionist.branch_id,
      current_values: current,
      proposed_changes: proposedChanges,
      reason: body.reason?.trim() || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !inserted) {
    console.error('[receptionist/correction-requests] insert failed:', error?.message)
    return NextResponse.json({ error: 'Failed to submit correction request' }, { status: 500 })
  }

  const changedFields = Object.keys(proposedChanges).filter(isCorrectableField).join(', ')
  await logActivity({
    clientId: client.id,
    counselorId: receptionist.id,
    actorRole: 'receptionist',
    actionType: 'correction_requested',
    description: `${receptionist.name} requested a correction for ${client.name} (${changedFields})`,
    metadata: { requestId: inserted.id, fields: Object.keys(proposedChanges) },
  })

  await createNotification({
    counselorId: receptionist.id,
    type: 'correction_request',
    title: `Correction requested for ${client.name}`,
    body: `${receptionist.name} asked to update ${changedFields}${body.reason?.trim() ? ` — ${body.reason.trim()}` : ''}`,
    clientId: client.id,
  })

  return NextResponse.json({
    id: inserted.id,
    duplicates,
    proposedChanges: proposedChanges as ProposedChanges,
  })
}
