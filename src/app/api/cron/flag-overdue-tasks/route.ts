import { createAdminClient } from '@/lib/supabase/server'
import { flagOverdueTasks } from '@/lib/admin/flagOverdueTasks'
import { NextResponse } from 'next/server'

// Runs on a schedule (see vercel.json) and does the one thing nothing else in
// the app does: actually sets tasks.negligence_flagged = true once a pending
// task's due date has passed. Every dashboard (CEO analytics, HR flags,
// counselor performance) already reads this column — it was just never being
// written, so overdue tasks silently never showed up as a productivity flag
// anywhere. Same logic is also exposed as a manual "Flag now" button on the
// HR Flags panel (see /api/admin/hr-flags/run) so a CEO doesn't have to wait
// on — or trust — the scheduled run.
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const { flagged } = await flagOverdueTasks(createAdminClient())
    return NextResponse.json({ success: true, flagged })
  } catch (err) {
    console.error('[cron/flag-overdue-tasks] failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to flag tasks' }, { status: 500 })
  }
}
