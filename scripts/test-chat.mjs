import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter((l) => l && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] })
)
const BASE = 'http://localhost:3000'
const pass = (m) => console.log('✓', m)
const fail = (m, d = '') => console.log('✗', m, d ? `— ${d}` : '')

async function chat(clientId, message) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, message }),
  })
  return res.json()
}

async function main() {
  console.log('\n=== CHAT / PANIC / AUTO-BOOK TESTS ===\n')
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: sana } = await db.from('clients').select('id, counselor_id').eq('name', 'Sana').single()
  if (!sana) { fail('Sana client missing'); return }

  // Panic
  const panicBefore = await db.from('panic_events').select('id', { count: 'exact', head: true }).eq('client_id', sana.id)
  const panicRes = await chat(sana.id, 'I want to give up on everything')
  const panicText = panicRes.content || panicRes.reply || ''
  if (panicText.includes('counselor') || panicText.includes('priority') || panicText.includes('difficult')) {
    pass('Panic sends holding message (not Claude)')
  } else fail('Panic response', panicText.slice(0, 120))
  const panicAfter = await db.from('panic_events').select('id').eq('client_id', sana.id).order('created_at', { ascending: false }).limit(1)
  if (panicAfter.data?.length) pass('panic_events row created')
  else fail('panic_events row')

  const { data: panicLog } = await db.from('student_activity_log').select('action_type').eq('client_id', sana.id).eq('action_type', 'panic_detected').limit(1)
  if (panicLog?.length) pass('Activity log panic_detected entry')
  else fail('panic_detected activity log')

  // Profile update
  const profRes = await chat(sana.id, 'my IELTS score is 6.5')
  const { data: profReq } = await db.from('profile_update_requests').select('id').eq('client_id', sana.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(1)
  if (profReq?.length) pass('profile_update_requests row created')
  else fail('profile update request')

  // Auto-book Sunday closed
  const reply = (r) => (r.content || r.reply || '').toLowerCase()

  const sunRes = await chat(sana.id, 'book me for Sunday at 2pm')
  if (reply(sunRes).includes('closed') || reply(sunRes).includes('sunday')) pass('Sunday booking rejected')
  else fail('Sunday closed response', reply(sunRes).slice(0, 100))

  const pastRes = await chat(sana.id, 'meet me yesterday')
  if (reply(pastRes).includes('past') || reply(pastRes).includes('already')) pass('Past date rejected')
  else fail('Past date response', reply(pastRes).slice(0, 100))

  const vagueRes = await chat(sana.id, 'can we meet sometime next week')
  if (reply(vagueRes).includes('specific') || reply(vagueRes).includes('time') || reply(vagueRes).includes('when')) {
    pass('Vague time asks for specific time')
  } else fail('Vague time response', reply(vagueRes).slice(0, 100))

  console.log('\nDone.')
}

main().catch(console.error)
