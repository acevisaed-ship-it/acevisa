import { createAdminClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { logActivity } from '@/lib/activityLog'
import { getTodayPKTDateString, getPKTDayBounds, countElapsedWorkingDays } from '@/lib/pkt'
import { NextResponse } from 'next/server'

// Replaces the old daily-followup-tasks cron. Instead of creating a
// blanket "report an update" task for every active client every morning
// (noise that trained counselors to auto-dismiss it), this checks for
// clients that have genuinely gone quiet:
//
//   - No counselor-authored action on the case (note, stage change,
//     message, task completion, document confirmation — see the
//     last_counselor_activity_at hook in src/lib/activityLog.ts) for more
//     than 2 of the assigned counselor's own working days.
//   - Not already covered by a pending reminder (counselor already has a
//     next step queued).
//   - Not paused via idle_snooze_until (e.g. "waiting on embassy 3 weeks").
//
// When a client qualifies, ONE task is created (source: 'idle_followup'),
// deduped so it never stacks. It auto-closes the moment the counselor
// takes any of the actions above (see resetIdleClock in activityLog.ts).
// If it sits open for one more working day, it escalates to the CEO
// instead of just re-notifying the counselor (see escalateStaleIdleTasks
// below) — a separate signal from the general negligence flag that HR
// Flags shows for any overdue task regardless of source.
//
// Also sweeps for client messages that have gone unanswered by any human
// counselor for 2+ hours — a distinct problem from a stale case (a case
// can be "not idle" because the AI replied, while the counselor still
// hasn't personally looked at it). Runs as part of this same once-daily
// sweep rather than its own high-frequency cron — see the note in the
// function below for the real-time-vs-once-daily tradeoff this implies.
const TERMINAL_STAGE = 7
const IDLE_WORKING_DAYS_THRESHOLD = 2
const ESCALATION_WORKING_DAYS_THRESHOLD = 1
const UNANSWERED_MESSAGE_HOURS = 2

export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()
  const todayPKT = getTodayPKTDateString()

  const created = await runIdleDetection(supabase, todayPKT)
  const escalated = await escalateStaleIdleTasks(supabase, todayPKT)
  const alerted = await flagUnansweredMessages(supabase)

  return NextResponse.json({ success: true, idleTasksCreated: created, escalated, unansweredAlerted: alerted })
}

async function runIdleDetection(supabase: ReturnType<typeof createAdminClient>, todayPKT: string) {
  const { endUTC } = getPKTDayBounds(todayPKT)

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select(
      'id, name, counselor_id, pipeline_stage, status, pipeline_active, last_counselor_activity_at, idle_snooze_until, counselors!clients_counselor_id_fkey(working_days)'
    )
    .eq('status', 'active')
    .eq('pipeline_active', true)
    .not('counselor_id', 'is', null)
    .lt('pipeline_stage', TERMINAL_STAGE)

  if (clientsError || !clients || clients.length === 0) {
    if (clientsError) console.error('[cron/idle-detection] clients fetch failed:', clientsError.message)
    return 0
  }

  // Clients that already have a pending reminder don't need an idle task —
  // the counselor already has a queued next step for them.
  const { data: pendingReminders } = await supabase
    .from('reminders')
    .select('client_id')
    .eq('status', 'pending')
  const clientsWithReminder = new Set((pendingReminders ?? []).map((r) => r.client_id))

  // Dedupe: never stack a second idle_followup task on a client that
  // already has one open.
  const { data: openIdleTasks } = await supabase
    .from('tasks')
    .select('client_id')
    .eq('source', 'idle_followup')
    .in('status', ['open', 'in_progress'])
  const clientsWithOpenIdleTask = new Set((openIdleTasks ?? []).map((t) => t.client_id))

  const rows: Array<{ counselor_id: string; client_id: string; task_text: string; due_date: string; status: string; source: string }> = []

  for (const c of clients) {
    if (clientsWithReminder.has(c.id) || clientsWithOpenIdleTask.has(c.id)) continue
    if (c.idle_snooze_until && c.idle_snooze_until >= todayPKT) continue

    const workingDays = (c.counselors as unknown as { working_days: number[] } | null)?.working_days ?? [1, 2, 3, 4, 5, 6]
    const lastActivityDay = getTodayPKTDateString(new Date(c.last_counselor_activity_at))
    const elapsed = countElapsedWorkingDays(lastActivityDay, todayPKT, workingDays)

    if (elapsed <= IDLE_WORKING_DAYS_THRESHOLD) continue

    rows.push({
      counselor_id: c.counselor_id!,
      client_id: c.id,
      task_text: `There has been no contact with ${c.name} and no update — set up a note or reminder if a meeting or response is scheduled.`,
      due_date: endUTC,
      status: 'open',
      source: 'idle_followup',
    })
  }

  if (rows.length === 0) return 0

  const { error: insertError } = await supabase.from('tasks').insert(rows)
  if (insertError) {
    console.error('[cron/idle-detection] insert failed:', insertError.message)
    return 0
  }

  const byCounselor = new Map<string, number>()
  for (const r of rows) {
    byCounselor.set(r.counselor_id, (byCounselor.get(r.counselor_id) ?? 0) + 1)
    await createNotification({
      counselorId: r.counselor_id,
      type: 'idle_followup',
      title: 'Client has gone quiet',
      body: r.task_text,
    })
  }

  return rows.length
}

async function escalateStaleIdleTasks(supabase: ReturnType<typeof createAdminClient>, todayPKT: string) {
  const { data: staleTasks } = await supabase
    .from('tasks')
    .select('id, task_text, client_id, counselor_id, created_at, clients(name), counselors!tasks_counselor_id_fkey(working_days)')
    .eq('source', 'idle_followup')
    .eq('escalated', false)
    .in('status', ['open', 'in_progress'])

  if (!staleTasks || staleTasks.length === 0) return 0

  let escalated = 0
  for (const t of staleTasks) {
    const workingDays = (t.counselors as unknown as { working_days: number[] } | null)?.working_days ?? [1, 2, 3, 4, 5, 6]
    const createdDay = getTodayPKTDateString(new Date(t.created_at))
    const elapsed = countElapsedWorkingDays(createdDay, todayPKT, workingDays)
    if (elapsed < ESCALATION_WORKING_DAYS_THRESHOLD) continue

    const client = t.clients as unknown as { name: string } | null
    const clientLabel = client?.name ? ` (${client.name})` : ''

    await supabase.from('tasks').update({ escalated: true, escalated_at: new Date().toISOString() }).eq('id', t.id)

    if (t.counselor_id) {
      await createNotification({
        counselorId: t.counselor_id,
        type: 'idle_escalation',
        title: `Escalated to CEO: unactioned idle follow-up${clientLabel}`,
        body: t.task_text,
        clientId: t.client_id ?? undefined,
        taskId: t.id,
      })
    }

    await logActivity({
      clientId: t.client_id,
      counselorId: t.counselor_id ?? undefined,
      actorRole: 'system',
      actionType: 'idle_task_escalated',
      description: `Idle follow-up task${clientLabel} unactioned for ${ESCALATION_WORKING_DAYS_THRESHOLD}+ working day(s) — escalated to CEO`,
      metadata: { taskId: t.id },
    })

    escalated++
  }

  return escalated
}

// Real-time detection would need a cron running every few minutes; this
// project's other automation all runs once daily, so for now this checks
// "unanswered for 2+ hours as of this run" rather than truly within 2
// hours of it happening. If more immediate alerting is needed, this
// function can be split into its own cron at a shorter interval — subject
// to what the hosting plan's cron frequency actually allows.
async function flagUnansweredMessages(supabase: ReturnType<typeof createAdminClient>) {
  const cutoff = new Date(Date.now() - UNANSWERED_MESSAGE_HOURS * 60 * 60 * 1000).toISOString()

  const { data: studentMessages } = await supabase
    .from('conversations')
    .select('id, client_id, timestamp, clients(name, counselor_id)')
    .eq('sender', 'student')
    .lt('timestamp', cutoff)
    .order('timestamp', { ascending: false })

  if (!studentMessages || studentMessages.length === 0) return 0

  // Only need the latest student message per client — if that one's
  // answered, everything before it is moot.
  const latestByClient = new Map<string, (typeof studentMessages)[number]>()
  for (const m of studentMessages) {
    if (!latestByClient.has(m.client_id)) latestByClient.set(m.client_id, m)
  }

  let alerted = 0
  for (const [clientId, msg] of latestByClient) {
    const { data: laterCounselorReply } = await supabase
      .from('conversations')
      .select('id')
      .eq('client_id', clientId)
      .eq('sender', 'counselor')
      .gt('timestamp', msg.timestamp)
      .limit(1)
      .maybeSingle()

    if (laterCounselorReply) continue

    // Dedupe: only alert once per unanswered message, not once per cron run.
    const { data: existingAlert } = await supabase
      .from('notifications')
      .select('id')
      .eq('client_id', clientId)
      .eq('type', 'unanswered_message')
      .gt('created_at', msg.timestamp)
      .limit(1)
      .maybeSingle()

    if (existingAlert) continue

    const client = msg.clients as unknown as { name: string; counselor_id: string | null } | null
    if (!client?.counselor_id) continue

    await createNotification({
      counselorId: client.counselor_id,
      type: 'unanswered_message',
      title: `${client.name} is still waiting on a reply`,
      body: `Their message has gone unanswered by a counselor for over ${UNANSWERED_MESSAGE_HOURS} hours.`,
      clientId,
    })
    alerted++
  }

  return alerted
}
