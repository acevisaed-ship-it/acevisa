import { NextResponse } from 'next/server'

// Superseded by /api/cron/idle-detection — the blanket "one task per
// active client per day" SOP task has been replaced with genuine
// idle-client detection (no counselor action for 2+ working days) per the
// CEO's redesign. Removed from vercel.json's cron schedule; this route is
// kept as an inert stub (rather than deleted — this repo can't delete
// files from this environment) so a stale cached call to it 200s harmlessly
// instead of 404ing.
export async function GET() {
  return NextResponse.json({ success: true, skipped: 'superseded_by_idle_detection' })
}
