import { NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { logStaffActivity } from '@/lib/activityLog'

// Haversine formula — returns distance in metres between two lat/lng points
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

// GET — fetch today's record for the logged-in counselor
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: counselor } = await admin
    .from('counselors')
    .select('id')
    .eq('email', user.email)
    .single()

  if (!counselor) return NextResponse.json({ error: 'Counselor not found' }, { status: 404 })

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }) // YYYY-MM-DD PKT

  const { data: record } = await admin
    .from('attendance_records')
    .select('id, date, check_in, check_out, status')
    .eq('counselor_id', counselor.id)
    .eq('date', today)
    .single()

  return NextResponse.json({ record: record ?? null, today })
}

// POST — clock in or clock out
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { action, lat, lng } = body as { action: 'clock_in' | 'clock_out'; lat?: number; lng?: number }

  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── Location checks (IP + GPS) are disabled for now — flagged as
  // unreliable in practice (dynamic office IPs, inaccurate browser GPS).
  // The office_location setting and haversineMetres/getClientIp helpers are
  // left in place so this can be re-enabled later without rebuilding it.
  // See portal_settings.office_location if re-enabling.
  void lat
  void lng
  void haversineMetres
  void getClientIp

  const { data: counselor } = await admin
    .from('counselors')
    .select('id, name, role')
    .eq('email', user.email)
    .single()

  if (!counselor) return NextResponse.json({ error: 'Counselor not found' }, { status: 404 })

  const now = new Date().toISOString()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
  const timeLabel = new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(now))

  const upsertQuery =
    action === 'clock_in'
      ? admin.from('attendance_records').upsert(
          { counselor_id: counselor.id, date: today, check_in: now, status: 'present' },
          { onConflict: 'counselor_id,date' }
        )
      : admin.from('attendance_records').upsert(
          { counselor_id: counselor.id, date: today, check_out: now, status: 'present' },
          { onConflict: 'counselor_id,date' }
        )

  const { data: record, error } = await upsertQuery.select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logStaffActivity({
    counselorId: counselor.id,
    actorRole: counselor.role || 'counselor',
    actionType: action === 'clock_in' ? 'attendance_clock_in' : 'attendance_clock_out',
    description:
      action === 'clock_in'
        ? `${counselor.name} clocked in at ${timeLabel} PKT`
        : `${counselor.name} clocked out at ${timeLabel} PKT`,
    metadata: { date: today, time: now },
  })

  return NextResponse.json({ record, action })
}
