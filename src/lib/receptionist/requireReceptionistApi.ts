import { getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Receptionist APIs: register clients, log walk-ins, look up records, and
// request/apply information corrections after admin/CEO approval.
// This guard is intentionally separate from requireAdminApi — receptionists must
// never fall through to admin-only data.
export async function requireReceptionistApi() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return {
      receptionist: null as null,
      error: NextResponse.json(
        { error: 'Your session expired. Please sign in again.', code: 'SESSION_EXPIRED' },
        { status: 401 }
      ),
    }
  }
  if (counselor.role !== 'receptionist') {
    return {
      receptionist: null as null,
      error: NextResponse.json(
        { error: 'Only reception staff can do this.', code: 'FORBIDDEN_ROLE' },
        { status: 403 }
      ),
    }
  }
  return { receptionist: counselor, error: null as null }
}
