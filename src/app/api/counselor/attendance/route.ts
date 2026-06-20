import { NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

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
  const { action, lat, lng } = body as { action: 'clock_in' | 'clock_out'; lat: number; lng: number }

  if (!action || lat === undefined || lng === undefined) {
    return NextResponse.json({ error: 'action, lat, and lng are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Load office location settings
  const { data: settingRow } = await admin
    .from('portal_settings')
    .select('value')
    .eq('key', 'office_location')
    .single()

  if (!settingRow?.value) {
    return NextResponse.json({ error: 'Office location not configured. Ask your admin to set it up in Settings.' }, { status: 503 })
  }

  const officeSettings = settingRow.value as { ip: string; lat: string; lng: string; radius: string }

  // ── Check 1: IP address ──────────────────────────────────────────────────
  if (officeSettings.ip) {
    const clientIp = getClientIp(request)
    if (clientIp !== officeSettings.ip) {
      return NextResponse.json({
        error: 'Clock-in not allowed from this network. You must be connected to the office network.',
        code: 'WRONG_IP',
      }, { status: 403 })
    }
  }

  // ── Check 2: GPS proximity ───────────────────────────────────────────────
  if (officeSettings.lat && officeSettings.lng) {
    const officeLat = parseFloat(officeSettings.lat)
    const officeLng = parseFloat(officeSettings.lng)
    const radius = parseFloat(officeSettings.radius || '100')
    const distance = haversineMetres(lat, lng, officeLat, officeLng)

    if (distance > radius) {
      return NextResponse.json({
        error: `You are ${Math.round(distance)}m from the office. Clock-in requires you to be within ${radius}m.`,
        code: 'WRONG_LOCATION',
        distance: Math.round(distance),
      }, { status: 403 })
    }
  }

  // ── Both checks passed — record attendance ───────────────────────────────
  const { data: counselor } = await admin
    .from('counselors')
    .select('id')
    .eq('email', user.email)
    .single()

  if (!counselor) return NextResponse.json({ error: 'Counselor not found' }, { status: 404 })

  const now = new Date().toISOString()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })

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

  return NextResponse.json({ record, action })
}
