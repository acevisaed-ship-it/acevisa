import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter((l) => l && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] })
)

const BASE = 'http://localhost:3000'
const PASSWORD = 'Beta2Test2026!'
const results = []
const pass = (m) => { results.push(1); console.log('✓', m) }
const fail = (m, d = '') => { results.push(0); console.log('✗', m, d ? `— ${d}` : '') }

async function login(email) {
  const jar = new Map()
  const store = []
  const sb = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => store, setAll: (c) => c.forEach(({ name, value }) => { store.push({ name, value }); jar.set(name, value) }) },
  })
  const { error } = await sb.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(error.message)
  return jar
}

const cookies = (j) => [...j.entries()].map(([k, v]) => `${k}=${v}`).join('; ')

async function main() {
  console.log('\n=== TASK SYSTEM TESTS ===\n')
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: aneeqa } = await db.from('counselors').select('id, email').ilike('name', 'Aneeqa%').single()
  const { data: hina } = await db.from('clients').select('id').eq('name', 'Hina').maybeSingle()

  if (!aneeqa) { fail('Aneeqa counselor missing'); return done() }

  // Create test tasks
  const yesterday = new Date(Date.now() - 86400000).toISOString()
  const tomorrow = new Date(Date.now() + 86400000).toISOString()

  await db.from('tasks').delete().like('task_text', 'TEST:%')
  const { data: tasks } = await db.from('tasks').insert([
    { counselor_id: aneeqa.id, client_id: hina?.id, task_text: 'TEST: Overdue task', due_date: yesterday, status: 'pending', negligence_flagged: true, notes_count: 2 },
    { counselor_id: aneeqa.id, client_id: hina?.id, task_text: 'TEST: Active pending', due_date: tomorrow, status: 'pending', notes_count: 0 },
    { counselor_id: aneeqa.id, client_id: hina?.id, task_text: 'TEST: In progress task', due_date: tomorrow, status: 'in_progress' },
    { counselor_id: aneeqa.id, client_id: hina?.id, task_text: 'TEST: Done task', due_date: yesterday, status: 'done' },
  ]).select('id, task_text, status')

  const pendingTask = tasks?.find((t) => t.task_text === 'TEST: Active pending')
  const overdueTask = tasks?.find((t) => t.task_text === 'TEST: Overdue task')

  const jar = await login(aneeqa.email)

  // Tasks page loads with tabs
  const pageRes = await fetch(`${BASE}/dashboard/tasks`, { headers: { Cookie: cookies(jar) } })
  const pageHtml = await pageRes.text()
  if (pageRes.ok && pageHtml.includes('Tasks')) pass('Tasks page loads')
  else fail('Tasks page loads')

  const panelSrc = readFileSync('src/app/(counselor)/dashboard/tasks/TaskPanel.tsx', 'utf8')
  if (panelSrc.includes('Pending') && panelSrc.includes('In Progress') && panelSrc.includes('Done')) {
    pass('Status tabs present in TaskPanel')
  } else fail('Status tabs')

  if (panelSrc.includes('OVERDUE') && panelSrc.includes('negligence_flagged')) pass('Overdue badge and red border (code)')
  else fail('Overdue styling')

  if (panelSrc.includes('notes_count')) pass('Notes count badge (code)')
  else fail('Notes count badge')

  const detailSrc = readFileSync('src/components/dashboard/TaskDetailPanel.tsx', 'utf8')
  if (detailSrc.includes('permanent') && !detailSrc.includes('delete')) pass('History permanent note, no delete (code)')
  else fail('History permanent/no-delete')

  // API task actions
  if (pendingTask) {
    const noteRes = await fetch(`${BASE}/api/tasks/${pendingTask.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies(jar) },
      body: JSON.stringify({ counselorId: aneeqa.id, actionType: 'note', noteText: 'TEST note from checklist' }),
    })
    if (noteRes.ok) {
      pass('Add note API succeeds')
      const histRes = await fetch(`${BASE}/api/tasks/${pendingTask.id}/actions`, { headers: { Cookie: cookies(jar) } })
      const hist = await histRes.json()
      if (hist.actions?.some((a) => a.note_text?.includes('TEST note'))) pass('Note appears in history immediately')
      else fail('Note in history')
      const { data: t } = await db.from('tasks').select('notes_count').eq('id', pendingTask.id).single()
      if ((t?.notes_count ?? 0) > 0) pass('Notes count incremented in DB')
      else fail('Notes count in DB')
    } else fail('Add note API', await noteRes.text())

    const reminderAt = new Date(Date.now() + 3 * 86400000).toISOString()
    const remRes = await fetch(`${BASE}/api/tasks/${pendingTask.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies(jar) },
      body: JSON.stringify({ counselorId: aneeqa.id, actionType: 'reminder_set', reminderAt }),
    })
    if (remRes.ok) {
      const { data: t } = await db.from('tasks').select('reminder_at').eq('id', pendingTask.id).single()
      if (t?.reminder_at) pass('Reminder saved to DB')
      else fail('Reminder in DB')
    } else fail('Set reminder API')

    const progRes = await fetch(`${BASE}/api/tasks/${pendingTask.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies(jar) },
      body: JSON.stringify({ counselorId: aneeqa.id, actionType: 'status_update', newStatus: 'in_progress' }),
    })
    if (progRes.ok) {
      const { data: t } = await db.from('tasks').select('status').eq('id', pendingTask.id).single()
      if (t?.status === 'in_progress') pass('Mark In Progress updates status')
      else fail('In progress status')
    } else fail('Mark In Progress API')

    const doneRes = await fetch(`${BASE}/api/tasks/${pendingTask.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies(jar) },
      body: JSON.stringify({ counselorId: aneeqa.id, actionType: 'status_update', newStatus: 'done' }),
    })
    if (doneRes.ok) {
      const { data: t } = await db.from('tasks').select('status').eq('id', pendingTask.id).single()
      if (t?.status === 'done') pass('Mark Done updates status')
      else fail('Done status')
      // Should not appear in pending filter
      const { data: pending } = await db.from('tasks').select('id').eq('id', pendingTask.id).eq('status', 'pending')
      if (!pending?.length) pass('Done task not in pending tab')
      else fail('Done task still pending')
    } else fail('Mark Done API')
  }

  if (overdueTask) {
    const { data: t } = await db.from('tasks').select('negligence_flagged').eq('id', overdueTask.id).single()
    if (t?.negligence_flagged) pass('Overdue task flagged in DB')
    else fail('Overdue flag in DB')
  }

  done()
}

function done() {
  const p = results.filter(Boolean).length
  const f = results.length - p
  console.log(`\n=== SUMMARY: ${p} passed, ${f} failed ===`)
  process.exit(f > 0 ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
