import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient, isBranchScoped } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { admin, error: authError } = await requireAdminApi()
  if (authError) return authError

  const supabase = createAdminClient()
  let query = supabase
    .from('client_correction_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (isBranchScoped(admin) && admin.branch_id) {
    query = query.eq('branch_id', admin.branch_id)
  }

  const { count, error } = await query
  if (error) {
    console.error('[admin/correction-requests/count] failed:', error.message)
    return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 })
  }

  return NextResponse.json({ count: count ?? 0 })
}
