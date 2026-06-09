import { getAuthenticatedAdmin } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function requireAdminApi() {
  const admin = await getAuthenticatedAdmin()
  if (!admin) {
    return {
      admin: null as null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { admin, error: null as null }
}
