import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { createAdminClient } from '@/lib/supabase/server'
import { clientCounselorName } from '@/lib/supabase/relations'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError

  const code = new URL(request.url).searchParams.get('code')?.trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ error: 'Missing client code' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select(`name, client_code, ${clientCounselorName}`)
    .eq('client_code', code)
    .eq('branch_id', receptionist.branch_id)
    .maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'No client found with that ID in your branch' }, { status: 404 })
  }

  const counselor = client.counselors as unknown as { name: string } | null

  return NextResponse.json({
    name: client.name,
    clientCode: client.client_code,
    counselorName: counselor?.name ?? 'Unassigned',
  })
}
