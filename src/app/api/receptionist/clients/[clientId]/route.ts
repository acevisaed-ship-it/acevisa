import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { findDuplicateClients, loadClientForm } from '@/lib/receptionist/clientForm'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError
  if (!receptionist.branch_id) {
    return NextResponse.json({ error: 'Receptionist is not assigned to a branch' }, { status: 400 })
  }

  const { clientId } = await params
  const supabase = createAdminClient()
  const client = await loadClientForm(supabase, {
    clientId,
    branchId: receptionist.branch_id,
  })

  if (!client) {
    return NextResponse.json({ error: 'Client not found in your branch' }, { status: 404 })
  }

  const duplicates = await findDuplicateClients(supabase, {
    branchId: receptionist.branch_id,
    excludeClientId: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email,
  })

  return NextResponse.json({ client, duplicates })
}
