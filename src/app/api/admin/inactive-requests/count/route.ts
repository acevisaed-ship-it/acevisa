import { requireCeoApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { error } = await requireCeoApi()
  if (error) return error

  const supabase = createAdminClient()
  const { count, error: fetchError } = await supabase
    .from('client_inactive_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (fetchError) {
    console.error('[admin/inactive-requests/count] failed:', fetchError.message)
    return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 })
  }

  return NextResponse.json({ count: count ?? 0 })
}
