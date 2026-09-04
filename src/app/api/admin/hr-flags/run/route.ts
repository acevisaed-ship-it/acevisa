import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { flagOverdueTasks } from '@/lib/admin/flagOverdueTasks'
import { NextResponse } from 'next/server'

// POST /api/admin/hr-flags/run — manual "Flag now" button on the HR Flags
// panel. Same logic the nightly cron runs; exists so a CEO/Branch Manager
// can get today's overdue tasks reflected as flags immediately, without
// waiting on (or having to trust) the scheduled Vercel Cron run.
export async function POST() {
  const { error } = await requireAdminApi()
  if (error) return error

  try {
    const { flagged } = await flagOverdueTasks(createAdminClient())
    return NextResponse.json({ success: true, flagged })
  } catch (err) {
    console.error('[admin/hr-flags/run] failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to flag overdue tasks' }, { status: 500 })
  }
}
