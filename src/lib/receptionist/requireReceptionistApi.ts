import { getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Receptionist accounts have exactly one job via the API: register a new client.
// This guard is intentionally separate from requireAdminApi — receptionists must
// never fall through to admin-only data.
export async function requireReceptionistApi() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return {
      receptionist: null as null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  if (counselor.role !== 'receptionist') {
    return {
      receptionist: null as null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { receptionist: counselor, error: null as null }
}
