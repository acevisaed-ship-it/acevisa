import { createAdminClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { getTodayPKTDateString, getPKTDayBounds, isSundayPKT } from '@/lib/pkt'
import { NextResponse } from 'next/server'

// SOP enforcement: every active, non-closed client must have a live "take
// action / report an update / qualify to next stage" task at all times.
// Runs each working morning (see vercel.json). For any active client that
// currently has zero pending tasks, creates one auto follow-up task due
// today. If the counselor doesn't act on it, tomorrow's flag-overdue-tasks
// cron flags it and alerts them — that's the negligence signal.
//
// Terminal pipeline stage 7 ("Alumni") is excluded — those cases are closed
// and don't need daily chasing.
const TERMINAL_STAGE = 7

export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const todayPKT = getTodayPKTDateString()
  if (isSundayPKT(todayPKT)) {
    return NextResponse.json({ success: true, skipped: 'sunday' })
  }

  const supabase = createAdminClient()
  const { endUTC } = getPKTDayBounds(todayPKT)

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name, counselor_id, pipeline_stage, status')
    .eq('status', 'active')
    .not('counselor_id', 'is', null)
    .lt('pipeline_stage', TERMINAL_STAGE)

  if (clientsError) {
    console.error('[cron/daily-followup-tasks] clients fetch failed:', clientsError.message)
    return NextResponse.json({ error: 'Failed to load clients' }, { status: 500 })
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json({ success: true, created: 0 })
  }

  const { data: pendingTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('client_id')
    .in('status', ['open', 'in_progress'])
    .not('client_id', 'is', null)

  if (tasksError) {
    console.error('[cron/daily-followup-tasks] tasks fetch failed:', tasksError.message)
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
  }

  const clientsWithOpenTask = new Set((pendingTasks ?? []).map((t) => t.client_id))
  const needsFollowUp = clients.filter((c) => !clientsWithOpenTask.has(c.id))

  if (needsFollowUp.length === 0) {
    return NextResponse.json({ success: true, created: 0 })
  }

  const rows = needsFollowUp.map((c) => ({
    counselor_id: c.counselor_id,
    client_id: c.id,
    task_text: `Daily SOP follow-up — report an update or advance ${c.name} to the next pipeline stage`,
    due_date: endUTC,
    status: 'open',
    source: 'auto_followup',
  }))

  const { error: insertError } = await supabase.from('tasks').insert(rows)
  if (insertError) {
    console.error('[cron/daily-followup-tasks] insert failed:', insertError.message)
    return NextResponse.json({ error: 'Failed to create follow-up tasks' }, { status: 500 })
  }

  // One summary notification per counselor rather than one per client.
  const byCounselor = new Map<string, string[]>()
  for (const c of needsFollowUp) {
    if (!c.counselor_id) continue
    const list = byCounselor.get(c.counselor_id) ?? []
    list.push(c.name)
    byCounselor.set(c.counselor_id, list)
  }

  for (const [counselorId, names] of byCounselor) {
    const shown = names.slice(0, 5).join(', ')
    const extra = names.length > 5 ? ` and ${names.length - 5} more` : ''
    await createNotification({
      counselorId,
      type: 'daily_followup',
      title: `Daily follow-up: ${names.length} client${names.length === 1 ? '' : 's'} need action today`,
      body: `${shown}${extra}. Report an update or move them to the next stage today.`,
    })
  }

  return NextResponse.json({ success: true, created: rows.length, counselors: byCounselor.size })
}
