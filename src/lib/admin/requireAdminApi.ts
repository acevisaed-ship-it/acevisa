import { getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function requireAdminApi() {
  // Use getAuthenticatedCounselor (same as the layout's requireAdmin) + role check.
  // getAuthenticatedAdmin used a separate code path that can fail when cookies behave
  // differently in API route handlers vs server components.
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    console.warn('[requireAdminApi] no authenticated counselor found')
    return {
      admin: null as null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  if (counselor.role !== 'admin') {
    console.warn('[requireAdminApi] counselor role is not admin:', counselor.role)
    return {
      admin: null as null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { admin: counselor, error: null as null }
}
