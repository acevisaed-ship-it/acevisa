import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { clientCounselorName } from '@/lib/supabase/relations'
import { NextResponse } from 'next/server'

export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  const supabase = createAdminClient()

  const { data: clients, error: queryError } = await supabase
    .from('clients')
    .select(`*, ${clientCounselorName}`)
    .order('created_at', { ascending: false })

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json({ clients: clients ?? [] })
}
