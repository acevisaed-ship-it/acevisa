import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { createAdminClient } from '@/lib/supabase/server'
import { clientCounselorName } from '@/lib/supabase/relations'
import { NextResponse } from 'next/server'

function sanitizeSearch(q: string) {
  return q.replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function GET(request: Request) {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError
  if (!receptionist.branch_id) {
    return NextResponse.json({ error: 'Receptionist is not assigned to a branch' }, { status: 400 })
  }

  const q = sanitizeSearch(new URL(request.url).searchParams.get('q') ?? '')
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = createAdminClient()
  const { data: clients, error } = await supabase
    .from('clients')
    .select(`id, name, client_code, phone, email, ${clientCounselorName}`)
    .eq('branch_id', receptionist.branch_id)
    .or(`name.ilike.%${q}%,client_code.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
    .order('name')
    .limit(10)

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
      phone: c.phone,
      email: c.email,
      counselorName: counselor?.name ?? 'Unassigned',
    }
  })

  return NextResponse.json({ results })
}
