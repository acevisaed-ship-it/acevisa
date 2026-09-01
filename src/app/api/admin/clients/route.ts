import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { clientCounselorName } from '@/lib/supabase/relations'
import { NextResponse } from 'next/server'

function sanitizeSearch(raw: string): string {
  return raw.replace(/[%_,()'"\\]/g, ' ').trim().slice(0, 80)
}

export async function GET(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const q = sanitizeSearch(new URL(request.url).searchParams.get('q') ?? '')
  const supabase = createAdminClient()

  if (q) {
    let query = supabase
      .from('clients')
      .select('id, name, client_code, phone')
      .neq('status', 'removed')
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%,client_code.ilike.%${q}%`)
      .order('name')
      .limit(8)

    if (isBranchScopedAdmin(admin)) {
      query = query.eq('branch_id', admin.branch_id)
    }

    const { data: clients, error: queryError } = await query
    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }
    return NextResponse.json({ clients: clients ?? [] })
  }

  const { data: clients, error: queryError } = await supabase
    .from('clients')
    .select(`*, ${clientCounselorName}`)
    .neq('status', 'removed')
    .order('created_at', { ascending: false })

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json({ clients: clients ?? [] })
}
