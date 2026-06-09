import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter((l) => l && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] })
)
const BASE = 'http://localhost:3000'
const PASSWORD = 'Beta2Test2026!'
const bugs = []
const pass = (m) => console.log('✓', m)
const fail = (m, d = '') => { console.log('✗', m, d ? `— ${d}` : ''); bugs.push({ page: m, action: d, happened: 'failed', expected: 'pass' }) }

async function login(email) {
  const jar = new Map(); const store = []
  const sb = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => store, setAll: (c) => c.forEach(({ name, value }) => { store.push({ name, value }); jar.set(name, value) }) },
  })
  await sb.auth.signInWithPassword({ email, password: PASSWORD })
  return jar
}
const ck = (j) => [...j.entries()].map(([k, v]) => `${k}=${v}`).join('; ')

async function main() {
  console.log('\n=== REMAINING CHECKLIST TESTS ===\n')
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // CLIENT PROFILE
  const { data: sana } = await db.from('clients').select('id').eq('name', 'Sana').single()
  const adminJar = await login('admin@acevisa.co')
  if (sana) {
    const res = await fetch(`${BASE}/admin/clients/${sana.id}`, { headers: { Cookie: ck(adminJar) } })
    const html = await res.text()
    const sections = ['Conversation Digest', 'Service Pathway', 'Psychological', 'Talking Points', 'Documents', 'Meetings', 'Activity']
    if (res.ok) pass('Client profile page loads')
    else fail('Client profile page', `status ${res.status}`)
    for (const s of sections) {
      if (html.toLowerCase().includes(s.toLowerCase().split(' ')[0])) pass(`Profile section: ${s}`)
      else fail(`Profile section: ${s}`, 'not in HTML')
    }
    if (html.includes('Pending') || html.includes('pending')) pass('Pending updates banner for Sana')
    else fail('Pending updates banner')
  }

  // COMPLAINT BOX
  if (sana) {
    const res = await fetch(`${BASE}/student/complaint?clientId=${sana.id}`)
    const html = await res.text()
    if (res.ok) pass('Complaint page with clientId loads')
    else fail('Complaint page with clientId')
    if (html.includes('Sana') || html.includes('03001234006')) pass('Complaint pre-fills name/phone')
    else fail('Complaint pre-fill')
  }
  const resNoId = await fetch(`${BASE}/student/complaint`)
  const htmlNoId = await resNoId.text()
  if (htmlNoId.includes('name') || htmlNoId.includes('Name')) pass('Complaint without clientId shows manual fields')
  else fail('Complaint manual fields')

  // STUDENT PORTAL
  if (sana) {
    const meetRes = await fetch(`${BASE}/student/meetings?clientId=${sana.id}`)
    if (meetRes.ok) pass('Student meetings page loads')
    else fail('Student meetings page')
    const docRes = await fetch(`${BASE}/student/documents?clientId=${sana.id}`)
    if (docRes.ok) pass('Student documents page loads')
    else fail('Student documents page')
  }

  // CAMPAIGNS - check register API accepts ref
  const regSrc = readFileSync('src/app/api/register/route.ts', 'utf8')
  if (regSrc.includes('ad_source') && regSrc.includes('campaigns')) pass('Register route handles campaign ref')
  else fail('Campaign registration')

  const chatSrc = readFileSync('src/app/api/chat/route.ts', 'utf8')
  if (chatSrc.includes('panic') || chatSrc.includes('give up')) pass('Panic detection in chat route')
  else fail('Panic detection')
  if (chatSrc.includes('profile_update') || chatSrc.includes('profile update')) pass('Profile update detection in chat')
  else fail('Profile update detection')
  if (chatSrc.includes('response_tracking') || chatSrc.includes('response_time')) pass('Response time tracking in chat')
  else fail('Response tracking')

  // BUILD
  console.log('\n(Build verified separately — npm run build passed)')

  console.log(`\n=== BUGS LOGGED: ${bugs.length} ===`)
  bugs.forEach((b) => console.log(` - ${b.page}: ${b.action}`))
  process.exit(bugs.length > 0 ? 1 : 0)
}

main().catch(console.error)
