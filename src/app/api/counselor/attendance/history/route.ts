import { addDaysToDateString, getTodayPKTDateString } from '@/lib/pkt'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/counselor/attendance/history — the logged-in staff member's own
// attendance for the last 30 days.
export async function GET() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = addDaysToDateString(getTodayPKTDateString(), -30)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('attendance_records')
    .select('id, date, check_in, check_out, status, notes')
    .eq('counselor_id', counselor.id)
    .gte('date', since)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ records: data ?? [] })
}
