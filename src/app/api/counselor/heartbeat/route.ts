import { NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { getTodayPKTDateString } from '@/lib/pkt'

// Only count a gap between pings as "active" if it's within this window —
// tolerant of normal jitter (client pings every 60s) but not idle/backgrounded
// tabs that resume pinging much later.
const MAX_GAP_SECONDS = 120

export async function POST() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = getTodayPKTDateString()
  const now = new Date()

  const { data: existing } = await supabase
    .from('portal_sessions')
    .select('id, active_seconds, last_ping_at')
    .eq('counselor_id', counselor.id)
    .eq('date', today)
    .maybeSingle()

  if (!existing) {
    const { error } = await supabase.from('portal_sessions').insert({
      counselor_id: counselor.id,
      date: today,
      active_seconds: 0,
      last_ping_at: now.toISOString(),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, activeSeconds: 0 })
  }

  let addSeconds = 0
  if (existing.last_ping_at) {
    const gapSeconds = (now.getTime() - new Date(existing.last_ping_at).getTime()) / 1000
    if (gapSeconds > 0 && gapSeconds <= MAX_GAP_SECONDS) {
      addSeconds = Math.round(gapSeconds)
    }
  }

  const activeSeconds = (existing.active_seconds ?? 0) + addSeconds

  const { error } = await supabase
    .from('portal_sessions')
    .update({ active_seconds: activeSeconds, last_ping_at: now.toISOString() })
    .eq('id', existing.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, activeSeconds })
}
