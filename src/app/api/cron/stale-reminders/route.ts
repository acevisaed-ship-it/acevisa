import { createAdminClient } from '@/lib/supabase/server'
import { checkStaleReminders } from '@/lib/tasks/checkStaleReminders'
import { getTodayPKTDateString } from '@/lib/pkt'
import { NextResponse } from 'next/server'

// Runs daily (see vercel.json): finds counselor-set reminders whose date has
// passed without being resolved, creates a follow-up task for the counselor,
// and drafts a CEO Agent item so the CEO knows to get an update or send a
// nudge. See checkStaleReminders() for the full rationale.
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const todayPKT = getTodayPKTDateString()
    const { followedUp } = await checkStaleReminders(createAdminClient(), todayPKT)
    return NextResponse.json({ success: true, followedUp })
  } catch (err) {
    console.error('[cron/stale-reminders] failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to check stale reminders' }, { status: 500 })
  }
}
