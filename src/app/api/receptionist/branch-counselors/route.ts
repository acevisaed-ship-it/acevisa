import { requireReceptionistApi } from '@/lib/receptionist/requireReceptionistApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { receptionist, error: authError } = await requireReceptionistApi()
  if (authError) return authError

  const supabase = createAdminClient()
  const { data: counselors, error } = await supabase
    .from('counselors')
    .select('id, name')
    .eq('role', 'counselor')
    .eq('status', 'active')
    .eq('branch_id', receptionist.branch_id)
    .order('name')

  if (error) {
    console.error('[receptionist/branch-counselors] error:', error)
    return NextResponse.json({ error: 'Failed to load counselors' }, { status: 500 })
  }

  return NextResponse.json({ counselors: counselors ?? [] })
}
