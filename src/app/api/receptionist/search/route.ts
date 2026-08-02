import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { createAdminClient } from '@/lib/supabase/server'
import { clientCounselorName } from '@/lib/supabase/relations'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError

  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = createAdminClient()
  const { data: clients, error } = await supabase
    .from('clients')
    .select(`id, name, client_code, ${clientCounselorName}`)
    .eq('branch_id', receptionist.branch_id)
    .or(`name.ilike.%${q}%,client_code.ilike.%${q}%`)
    .order('name')
    .limit(8)

  if (error) {
    console.error('[receptionist/search] query failed:', error.message)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }

  const results = (clients ?? []).map((c) => {
    const counselor = c.counselors as unknown as { name: string } | null
    return {
      id: c.id,
      name: c.name,
      clientCode: c.client_code,
      counselorName: counselor?.name ?? 'Unassigned',
    }
  })

  return NextResponse.json({ results })
}
