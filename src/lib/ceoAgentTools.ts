import type { SupabaseClient } from '@supabase/supabase-js'
import type Anthropic from '@anthropic-ai/sdk'
import { logActivity, logStaffActivity } from '@/lib/activityLog'
import { createNotification } from '@/lib/notifications'
import { getTodayPKTDateString, getPKTDayBounds, formatPKTDate, formatPKTDueDate, isOverdueInPKT } from '@/lib/pkt'
import { computeTaskUrgency, URGENCY_LABELS } from '@/lib/taskUrgency'

// Tool belt for the CEO chat assistant (see /api/ceo-agent/chat and
// CeoChatBox.tsx). Every tool here is read-only EXCEPT assign_task, which
// creates a real task the moment it's called — there is no draft/approve
// step, because the CEO issuing the command directly IS the approval (unlike
// the autonomous daily review in agentDrafts.ts, which proposes and waits).
//
// The model is instructed (see the system prompt in the chat route) to
// always resolve a person or case via search_* before acting on it rather
// than guessing a name/id from training-data assumptions — none of this
// agency's data was in the model's training data, so every fact must come
// from a tool call.

const PIPELINE_STAGE_LABELS: Record<number, string> = {
  1: 'New Lead',
  2: 'Qualified',
  3: 'Registered Client',
  4: 'Documents in Progress',
  5: 'Application Submitted',
  6: 'Visa Outcome',
  7: 'Alumni',
}

export const CEO_AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_clients',
    description:
      'Search for clients/students by name, phone, or client code. Returns matching clients with id, assigned counselor, pipeline stage, and status. ALWAYS call this before referencing a specific client by name or before linking a task to one — never assume a clientId.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Name, phone, or client code to search for' } },
      required: ['query'],
    },
  },
  {
    name: 'get_client_case',
    description:
      "Full case detail for one client: profile, assigned counselor, pipeline stage, days since the counselor last touched the case, open/overdue tasks, negligence flags, and the last 10 activity log entries. Requires an exact clientId — get one from search_clients first.",
    input_schema: {
      type: 'object',
      properties: { clientId: { type: 'string' } },
      required: ['clientId'],
    },
  },
  {
    name: 'search_counselors',
    description:
      'Search staff (counselors and branch managers) by name. Returns matching people with id, role, and branch. ALWAYS call this before assigning a task to someone or answering a question about a specific person by name — never assume a counselorId.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'get_counselor_overview',
    description:
      "One counselor's current workload: open/in-progress task counts, overdue count, negligence-flagged count, client count, and today's attendance status. Requires an exact counselorId — get one from search_counselors first.",
    input_schema: {
      type: 'object',
      properties: { counselorId: { type: 'string' } },
      required: ['counselorId'],
    },
  },
  {
    name: 'list_all_counselors_summary',
    description:
      'Workload snapshot for every active counselor at once (open, overdue, negligence-flagged task counts). Use this directly for "who is overloaded", "who has the most overdue tasks", "rank counselors by workload" — much more efficient than calling get_counselor_overview per person.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_tasks',
    description:
      'List tasks matching filters. Use for "what is X working on", "what\'s overdue", "show me HR flags", "what tasks does client Y have open". To see what someone COMPLETED in a date range, pass status: "completed" plus completedSince/completedUntil.',
    input_schema: {
      type: 'object',
      properties: {
        counselorId: { type: 'string' },
        clientId: { type: 'string' },
        onlyOverdue: { type: 'boolean' },
        onlyNegligenceFlagged: { type: 'boolean' },
        status: { type: 'string', enum: ['open', 'in_progress', 'completed', 'closed'] },
        completedSince: { type: 'string', description: 'YYYY-MM-DD, inclusive. Filters by completed_at — only useful combined with status: "completed".' },
        completedUntil: { type: 'string', description: 'YYYY-MM-DD, inclusive. Defaults to completedSince (a single day) if that is given but this is omitted.' },
        limit: { type: 'number', description: 'Default 20, max 50' },
      },
      required: [],
    },
  },
  {
    name: 'get_counselor_activity',
    description:
      'The best tool for "what did X do [today / this week / on a given day / since a date]" — a single chronological feed of everything one counselor did across ALL their clients: task completions, stage changes, document requests, notes, messages, anything logged in the activity trail, each with a description and which client (if any) it touched. Use this INSTEAD of calling get_client_case once per client — it answers "walk me through her day" or "what has she actually written/updated" in one call. Defaults to today if no dates are given. Requires an exact counselorId from search_counselors.',
    input_schema: {
      type: 'object',
      properties: {
        counselorId: { type: 'string' },
        sinceDate: { type: 'string', description: 'YYYY-MM-DD, inclusive start. Defaults to today.' },
        untilDate: { type: 'string', description: 'YYYY-MM-DD, inclusive end. Defaults to today.' },
        limit: { type: 'number', description: 'Default 100, max 300' },
      },
      required: ['counselorId'],
    },
  },
  {
    name: 'get_attendance_today',
    description: "Who's present, late, or absent today, agency-wide, with check-in times.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_pipeline_overview',
    description:
      'Count of active clients at each pipeline stage, agency-wide. Use for "how many leads/clients do we have", "how\'s the pipeline looking" type questions.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'assign_task',
    description:
      "Create a REAL task assigned to a counselor, effective immediately — this is not a draft or suggestion, it lands directly in that counselor's task list and notifies them. Only call this when the CEO has clearly instructed a task be assigned. Resolve the counselor (and client, if mentioned) via search first; if the name was ambiguous, ask the CEO to confirm instead of guessing which person or case they meant.",
    input_schema: {
      type: 'object',
      properties: {
        counselorId: { type: 'string', description: 'Exact id from search_counselors' },
        taskText: { type: 'string', description: 'What the counselor needs to do' },
        dueDate: { type: 'string', description: 'YYYY-MM-DD, optional — omit if no specific deadline' },
        clientId: { type: 'string', description: 'Optional — links the task to a specific case' },
        isMilestone: {
          type: 'boolean',
          description: 'True only if this is tied to reaching a case stage rather than a calendar date',
        },
      },
      required: ['counselorId', 'taskText'],
    },
  },
]

type CeoActor = { id: string; name: string; role: string }

export async function executeCeoAgentTool(
  toolName: string,
  input: Record<string, unknown>,
  supabase: SupabaseClient,
  ceo: CeoActor
): Promise<unknown> {
  switch (toolName) {
    case 'search_clients':
      return searchClients(supabase, String(input.query ?? ''))
    case 'get_client_case':
      return getClientCase(supabase, String(input.clientId ?? ''))
    case 'search_counselors':
      return searchCounselors(supabase, String(input.query ?? ''))
    case 'get_counselor_overview':
      return getCounselorOverview(supabase, String(input.counselorId ?? ''))
    case 'list_all_counselors_summary':
      return listAllCounselorsSummary(supabase)
    case 'get_tasks':
      return getTasks(supabase, input)
    case 'get_counselor_activity':
      return getCounselorActivity(supabase, input)
    case 'get_attendance_today':
      return getAttendanceToday(supabase)
    case 'get_pipeline_overview':
      return getPipelineOverview(supabase)
    case 'assign_task':
      return assignTask(supabase, input, ceo)
    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

async function searchClients(supabase: SupabaseClient, query: string) {
  if (!query.trim()) return { error: 'query is required' }
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone, client_code, pipeline_stage, status, counselors!clients_counselor_id_fkey(name)')
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%,client_code.ilike.%${query}%`)
    .neq('status', 'removed')
    .limit(8)

  if (error) return { error: error.message }
  return {
    matches: (data ?? []).map((c) => ({
      clientId: c.id,
      name: c.name,
      phone: c.phone,
      clientCode: c.client_code,
      pipelineStage: PIPELINE_STAGE_LABELS[c.pipeline_stage] ?? c.pipeline_stage,
      status: c.status,
      counselor: (c.counselors as unknown as { name: string } | null)?.name ?? 'Unassigned',
    })),
  }
}

async function getClientCase(supabase: SupabaseClient, clientId: string) {
  if (!clientId) return { error: 'clientId is required' }

  const [{ data: client }, { data: tasks }, { data: activity }] = await Promise.all([
    supabase
      .from('clients')
      .select(
        'id, name, phone, city, status, pipeline_stage, pipeline_active, last_counselor_activity_at, idle_snooze_until, counselors!clients_counselor_id_fkey(id, name)'
      )
      .eq('id', clientId)
      .maybeSingle(),
    supabase
      .from('tasks')
      .select('id, task_text, due_date, status, negligence_flagged, is_milestone, source')
      .eq('client_id', clientId)
      .in('status', ['open', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('activity_logs')
      .select('description, action_type, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (!client) return { error: 'Client not found' }

  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(client.last_counselor_activity_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  return {
    clientId: client.id,
    name: client.name,
    phone: client.phone,
    city: client.city,
    status: client.status,
    pipelineStage: PIPELINE_STAGE_LABELS[client.pipeline_stage] ?? client.pipeline_stage,
    pipelineActive: client.pipeline_active,
    counselor: (client.counselors as unknown as { id: string; name: string } | null) ?? null,
    daysSinceLastCounselorActivity: daysSinceActivity,
    idleFollowUpSnoozedUntil: client.idle_snooze_until,
    openTasks: (tasks ?? []).map((t) => ({
      taskId: t.id,
      text: t.task_text,
      dueDate: formatPKTDueDate(t.due_date),
      overdue: isOverdueInPKT(t.due_date),
      negligenceFlagged: t.negligence_flagged,
      urgency: URGENCY_LABELS[computeTaskUrgency({ dueDate: t.due_date, isMilestone: t.is_milestone })],
      source: t.source,
    })),
    recentActivity: (activity ?? []).map((a) => ({
      what: a.description,
      type: a.action_type,
      when: formatPKTDate(a.created_at),
    })),
  }
}

async function searchCounselors(supabase: SupabaseClient, query: string) {
  if (!query.trim()) return { error: 'query is required' }
  const { data, error } = await supabase
    .from('counselors')
    .select('id, name, role, status, branches(name)')
    .ilike('name', `%${query}%`)
    .eq('status', 'active')
    .limit(8)

  if (error) return { error: error.message }
  return {
    matches: (data ?? []).map((c) => ({
      counselorId: c.id,
      name: c.name,
      role: c.role,
      branch: (c.branches as unknown as { name: string } | null)?.name ?? null,
    })),
  }
}

async function getCounselorOverview(supabase: SupabaseClient, counselorId: string) {
  if (!counselorId) return { error: 'counselorId is required' }
  const today = getTodayPKTDateString()

  const [{ data: counselor }, { data: tasks }, { count: clientCount }, { data: attendance }] = await Promise.all([
    supabase.from('counselors').select('id, name, role, status, branches(name)').eq('id', counselorId).maybeSingle(),
    supabase.from('tasks').select('id, status, due_date, negligence_flagged').eq('counselor_id', counselorId),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('counselor_id', counselorId).eq('status', 'active'),
    supabase.from('attendance_records').select('status, check_in').eq('counselor_id', counselorId).eq('date', today).maybeSingle(),
  ])

  if (!counselor) return { error: 'Counselor not found' }

  const openTasks = (tasks ?? []).filter((t) => t.status === 'open' || t.status === 'in_progress')
  const overdueTasks = openTasks.filter((t) => isOverdueInPKT(t.due_date))
  const negligenceFlagged = (tasks ?? []).filter((t) => t.negligence_flagged)

  return {
    counselorId: counselor.id,
    name: counselor.name,
    role: counselor.role,
    branch: (counselor.branches as unknown as { name: string } | null)?.name ?? null,
    activeClientCount: clientCount ?? 0,
    openTaskCount: openTasks.length,
    overdueTaskCount: overdueTasks.length,
    negligenceFlaggedCount: negligenceFlagged.length,
    attendanceToday: attendance ? { status: attendance.status, checkedInAt: attendance.check_in } : 'No record yet today',
  }
}

async function listAllCounselorsSummary(supabase: SupabaseClient) {
  const [{ data: counselors }, { data: tasks }] = await Promise.all([
    supabase.from('counselors').select('id, name').eq('role', 'counselor').eq('status', 'active'),
    supabase.from('tasks').select('counselor_id, status, due_date, negligence_flagged').in('status', ['open', 'in_progress']),
  ])

  const byId = new Map((counselors ?? []).map((c) => [c.id, { name: c.name, open: 0, overdue: 0, negligence: 0 }]))
  for (const t of tasks ?? []) {
    const entry = t.counselor_id ? byId.get(t.counselor_id) : undefined
    if (!entry) continue
    entry.open++
    if (isOverdueInPKT(t.due_date)) entry.overdue++
    if (t.negligence_flagged) entry.negligence++
  }

  return {
    counselors: Array.from(byId.entries())
      .map(([counselorId, v]) => ({ counselorId, ...v }))
      .sort((a, b) => b.overdue - a.overdue || b.open - a.open),
  }
}

async function getTasks(
  supabase: SupabaseClient,
  input: Record<string, unknown>
) {
  const limit = Math.min(Number(input.limit) || 20, 50)
  let query = supabase
    .from('tasks')
    .select('id, task_text, due_date, completed_at, status, negligence_flagged, is_milestone, counselors!tasks_counselor_id_fkey(name), clients(name)')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(limit)

  if (input.counselorId) query = query.eq('counselor_id', String(input.counselorId))
  if (input.clientId) query = query.eq('client_id', String(input.clientId))
  if (input.status) query = query.eq('status', String(input.status))
  else if (!input.onlyOverdue && !input.onlyNegligenceFlagged) query = query.in('status', ['open', 'in_progress'])
  if (input.onlyNegligenceFlagged) query = query.eq('negligence_flagged', true)
  if (input.completedSince) {
    query = query.gte('completed_at', getPKTDayBounds(String(input.completedSince)).startUTC)
  }
  if (input.completedUntil || input.completedSince) {
    const untilDate = String(input.completedUntil || input.completedSince)
    query = query.lte('completed_at', getPKTDayBounds(untilDate).endUTC)
  }

  const { data, error } = await query
  if (error) return { error: error.message }

  let tasks = data ?? []
  if (input.onlyOverdue) tasks = tasks.filter((t) => isOverdueInPKT(t.due_date))

  return {
    tasks: tasks.map((t) => ({
      taskId: t.id,
      text: t.task_text,
      dueDate: formatPKTDueDate(t.due_date),
      completedAt: t.completed_at ? formatPKTDate(t.completed_at) : null,
      overdue: isOverdueInPKT(t.due_date),
      status: t.status,
      negligenceFlagged: t.negligence_flagged,
      counselor: (t.counselors as unknown as { name: string } | null)?.name ?? 'Unassigned',
      client: (t.clients as unknown as { name: string } | null)?.name ?? null,
    })),
  }
}

async function getCounselorActivity(supabase: SupabaseClient, input: Record<string, unknown>) {
  const counselorId = String(input.counselorId ?? '')
  if (!counselorId) return { error: 'counselorId is required' }

  const { data: counselor } = await supabase.from('counselors').select('id, name').eq('id', counselorId).maybeSingle()
  if (!counselor) return { error: 'Counselor not found' }

  const today = getTodayPKTDateString()
  const sinceDate = typeof input.sinceDate === 'string' && input.sinceDate ? input.sinceDate : today
  const untilDate = typeof input.untilDate === 'string' && input.untilDate ? input.untilDate : today
  const limit = Math.min(Number(input.limit) || 100, 300)

  const { startUTC } = getPKTDayBounds(sinceDate)
  const { endUTC } = getPKTDayBounds(untilDate)

  const { data, error } = await supabase
    .from('activity_logs')
    .select('description, action_type, created_at, clients(name)')
    .eq('counselor_id', counselorId)
    .gte('created_at', startUTC)
    .lte('created_at', endUTC)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) return { error: error.message }

  const entries = data ?? []
  return {
    counselor: counselor.name,
    range: sinceDate === untilDate ? sinceDate : `${sinceDate} to ${untilDate}`,
    entryCount: entries.length,
    truncated: entries.length >= limit,
    entries: entries.map((a) => ({
      what: a.description,
      type: a.action_type,
      client: (a.clients as unknown as { name: string } | null)?.name ?? null,
      when: formatPKTDate(a.created_at),
    })),
  }
}

async function getAttendanceToday(supabase: SupabaseClient) {
  const today = getTodayPKTDateString()
  const [{ data: counselors }, { data: records }] = await Promise.all([
    supabase.from('counselors').select('id, name').eq('role', 'counselor').eq('status', 'active'),
    supabase.from('attendance_records').select('counselor_id, status, check_in, check_out').eq('date', today),
  ])

  const byId = new Map((records ?? []).map((r) => [r.counselor_id, r]))
  return {
    date: today,
    staff: (counselors ?? []).map((c) => {
      const r = byId.get(c.id)
      return {
        name: c.name,
        status: r?.status ?? 'no_record_yet',
        checkedInAt: r?.check_in ?? null,
        checkedOutAt: r?.check_out ?? null,
      }
    }),
  }
}

async function getPipelineOverview(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('clients').select('pipeline_stage').eq('status', 'active').eq('pipeline_active', true)
  if (error) return { error: error.message }

  const counts = new Map<number, number>()
  for (const c of data ?? []) counts.set(c.pipeline_stage, (counts.get(c.pipeline_stage) ?? 0) + 1)

  return {
    totalActive: (data ?? []).length,
    byStage: Array.from(counts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([stage, count]) => ({ stage: PIPELINE_STAGE_LABELS[stage] ?? stage, count })),
  }
}

async function assignTask(supabase: SupabaseClient, input: Record<string, unknown>, ceo: CeoActor) {
  const counselorId = String(input.counselorId ?? '')
  const taskText = String(input.taskText ?? '').trim()
  if (!counselorId || !taskText) return { error: 'counselorId and taskText are required' }

  const { data: counselor } = await supabase
    .from('counselors')
    .select('id, name, status')
    .eq('id', counselorId)
    .maybeSingle()
  if (!counselor || counselor.status !== 'active') return { error: 'Counselor not found or inactive' }

  let client: { id: string; name: string } | null = null
  if (input.clientId) {
    const { data } = await supabase.from('clients').select('id, name').eq('id', String(input.clientId)).neq('status', 'removed').maybeSingle()
    if (!data) return { error: 'Client not found' }
    client = data
  }

  const dueDate = input.dueDate ? `${String(input.dueDate)}T23:59:59+05:00` : null

  const { data: newTask, error: insertError } = await supabase
    .from('tasks')
    .insert({
      counselor_id: counselor.id,
      client_id: client?.id ?? null,
      task_text: taskText,
      due_date: dueDate,
      status: 'open',
      source: 'assigned',
      assigned_by: ceo.id,
      is_milestone: !!input.isMilestone,
    })
    .select('id')
    .single()

  if (insertError || !newTask) return { error: insertError?.message ?? 'Failed to create task' }

  await createNotification({
    counselorId: counselor.id,
    type: 'task_assigned',
    title: `New task from ${ceo.name}`,
    body: taskText,
    taskId: newTask.id,
    clientId: client?.id,
  })

  const description = `${ceo.name} assigned a task to ${counselor.name} via the CEO Agent chat: "${taskText.slice(0, 80)}${taskText.length > 80 ? '…' : ''}"`
  if (client) {
    await logActivity({
      clientId: client.id,
      counselorId: ceo.id,
      actorRole: ceo.role,
      actionType: 'task_assigned',
      description,
      metadata: { taskId: newTask.id, assignedTo: counselor.id, viaChat: true },
    })
  } else {
    await logStaffActivity({
      counselorId: ceo.id,
      actorRole: ceo.role,
      actionType: 'task_assigned',
      description,
      metadata: { taskId: newTask.id, assignedTo: counselor.id, viaChat: true },
    })
  }

  return {
    success: true,
    taskId: newTask.id,
    assignedTo: counselor.name,
    client: client?.name ?? null,
    taskText,
    dueDate: input.dueDate ?? null,
  }
}
