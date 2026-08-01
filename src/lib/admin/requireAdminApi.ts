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
  // 'ceo' (Super Admin) gets everything 'admin' (Branch Manager) gets, unscoped.
  if (counselor.role !== 'admin' && counselor.role !== 'ceo') {
    console.warn('[requireAdminApi] counselor role is not admin/ceo:', counselor.role)
    return {
      admin: null as null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { admin: counselor, error: null as null }
}

// CEO-only API routes (e.g. branch management).
export async function requireCeoApi() {
  const { admin, error } = await requireAdminApi()
  if (error) return { admin: null as null, error }

  if (admin.role !== 'ceo') {
    return {
      admin: null as null,
      error: NextResponse.json({ error: 'CEO access only' }, { status: 403 }),
    }
  }
  return { admin, error: null as null }
}
