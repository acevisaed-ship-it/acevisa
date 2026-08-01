import { getCounselorsWithCounts } from '@/lib/admin/getCounselorsWithCounts'
import { getAuthenticatedAdmin, isBranchScoped } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const admin = await getAuthenticatedAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const counselors = await getCounselorsWithCounts(isBranchScoped(admin) ? admin.branch_id : undefined)
    return NextResponse.json({ counselors })
  } catch (error) {
    console.error('Admin counselors fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch counselors' }, { status: 500 })
  }
}
