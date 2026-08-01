import { createAdminClient, getAuthenticatedAdmin, isBranchScoped } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const admin = await getAuthenticatedAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  let query = supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .is('counselor_id', null)
  if (isBranchScoped(admin)) {
    query = query.eq('branch_id', admin.branch_id)
  }
  const { count, error } = await query

  if (error) {
    console.error('Unassigned count error:', error)
    return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 })
  }

  return NextResponse.json({ count: count ?? 0 })
}
