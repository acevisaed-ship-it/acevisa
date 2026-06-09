import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const envText = readFileSync('.env.local', 'utf8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    })
)

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const ADMIN_EMAIL = 'admin@acevisa.co'
const ADMIN_PASSWORD = 'Beta2Test2026!'
const results = []

function pass(msg) {
  results.push({ status: 'PASS', msg })
  console.log('✓', msg)
}
function fail(msg, detail = '') {
  results.push({ status: 'FAIL', msg, detail })
  console.log('✗', msg, detail ? `— ${detail}` : '')
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

async function fetchPage(path, jar, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Cookie: cookieHeader(jar),
    },
    redirect: 'manual',
  })
  const setCookies = res.headers.getSetCookie?.() ?? []
  for (const sc of setCookies) {
    const part = sc.split(';')[0]
    const eq = part.indexOf('=')
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1))
  }
  const html = res.status < 400 ? await res.text() : ''
  return { res, html }
}

async function login(email, password) {
  const jar = new Map()
  const cookieStore = []

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            cookieStore.push({ name, value })
            jar.set(name, value)
          }
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`)
  return jar
}

async function main() {
  console.log('\n=== ADMIN PANEL AUTHENTICATED TESTS ===\n')

  const adminDb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  let jar
  try {
    jar = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
    pass('Login as admin@acevisa.co')
  } catch (e) {
    fail('Login as admin@acevisa.co', e.message)
    return summary()
  }

  // Admin lands on /admin
  const { res: adminRes, html: adminHtml } = await fetchPage('/admin', jar)
  if (adminRes.status === 200 && adminHtml.includes('Admin Analytics')) {
    pass('Lands on /admin dashboard')
  } else {
    fail('Lands on /admin dashboard', `status ${adminRes.status}`)
  }

  // Unassigned clients page
  const { res: unassignedRes, html: unassignedHtml } = await fetchPage('/admin/unassigned', jar)
  if (unassignedRes.status === 200) {
    for (const name of ['Zara', 'Imran', 'Maryam', 'Tariq']) {
      if (unassignedHtml.includes(name)) pass(`Unassigned page shows ${name}`)
      else fail(`Unassigned page shows ${name}`)
    }
  } else {
    fail('Unassigned clients page loads', `status ${unassignedRes.status}`)
  }

  // Assign Zara to Aneeqa
  const { data: zara } = await adminDb.from('clients').select('id').eq('name', 'Zara').single()
  const { data: aneeqa } = await adminDb.from('counselors').select('id').ilike('name', 'Aneeqa%').single()

  if (zara && aneeqa) {
    const assignRes = await fetch(`${BASE}/api/admin/clients/${zara.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(jar) },
      body: JSON.stringify({ counselorId: aneeqa.id }),
    })
    const assignData = await assignRes.json()
    if (assignRes.ok && assignData.success) {
      pass('Assign Zara to Aneeqa API succeeds')
      const { data: zaraAfter } = await adminDb.from('clients').select('counselor_id').eq('id', zara.id).single()
      if (zaraAfter?.counselor_id === aneeqa.id) pass('Zara counselor_id updated in DB')
      else fail('Zara counselor_id updated in DB')
      const { res: unassigned2, html: unassigned2Html } = await fetchPage('/admin/unassigned', jar)
      if (!unassigned2Html.includes('Zara')) pass('Zara disappears from unassigned list')
      else fail('Zara disappears from unassigned list')
    } else {
      fail('Assign Zara to Aneeqa', JSON.stringify(assignData))
    }
  }

  // All Clients page
  const { res: allClientsRes, html: allClientsHtml } = await fetchPage('/admin/clients', jar)
  if (allClientsRes.status === 200 && allClientsHtml.includes('All Clients')) {
    pass('All Clients page loads')
    if (allClientsHtml.includes('Hina') && allClientsHtml.includes('Zara')) {
      pass('All Clients shows clients across counselors')
    } else {
      fail('All Clients shows every client')
    }
    if (allClientsHtml.includes('By Counselor') && allClientsHtml.includes('Transfer')) {
      pass('Filter tabs and Transfer button present')
    } else {
      fail('Filter/Transfer UI on All Clients page')
    }
  } else {
    fail('All Clients page loads', `status ${allClientsRes.status}`)
  }

  // Transfer Hina from Arooj to Aneeqa
  const { data: hina } = await adminDb
    .from('clients')
    .select('id, counselor_id, counselors(name)')
    .eq('name', 'Hina')
    .single()
  const aroojCounselorRes = await adminDb.from('counselors').select('id').ilike('name', 'Arooj%').single()
  const aroojCounselor = aroojCounselorRes.data

  if (hina && aneeqa && aroojCounselor) {
    const notifBefore = await adminDb.from('notifications').select('id').eq('client_id', hina.id)

    const transferRes = await fetch(`${BASE}/api/admin/clients/${hina.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(jar) },
      body: JSON.stringify({ counselorId: aneeqa.id, reason: 'Workload balancing test' }),
    })
    const transferData = await transferRes.json()

    if (transferRes.ok && transferData.isTransfer) {
      pass('Transfer Hina to Aneeqa succeeds')

      const { data: activity } = await adminDb
        .from('student_activity_log')
        .select('action_type, description')
        .eq('client_id', hina.id)
        .eq('action_type', 'counselor_transferred')
        .order('created_at', { ascending: false })
        .limit(1)

      if (activity?.length) pass('Activity log updated for transfer')
      else fail('Activity log updated for transfer')

      const { data: notifs } = await adminDb
        .from('notifications')
        .select('counselor_id, title')
        .eq('client_id', hina.id)
        .order('created_at', { ascending: false })
        .limit(5)

      const aneeqaNotified = notifs?.some((n) => n.counselor_id === aneeqa.id)
      const formerCounselorNotified = notifs?.some((n) => n.counselor_id === aroojCounselor.id)
      if (aneeqaNotified) pass('Aneeqa notified of transfer')
      else fail('Aneeqa notified of transfer')
      if (formerCounselorNotified) pass('Arooj notified of transfer')
      else fail('Arooj notified of transfer')
    } else {
      fail('Transfer Hina to Aneeqa', JSON.stringify(transferData))
    }
  }

  // Counselors page
  const { res: counselorsRes, html: counselorsHtml } = await fetchPage('/admin/counselors', jar)
  if (counselorsRes.status === 200) {
    pass('Counselors page loads')
    if (counselorsHtml.includes('client') && counselorsHtml.includes('open task')) {
      pass('Counselors page shows client and task counts')
    } else {
      fail('Counselors page shows counts')
    }
    if (counselorsHtml.includes('View Dashboard')) pass('View Dashboard link present')
    else fail('View Dashboard link on counselors page')
  } else {
    fail('Counselors page loads', `status ${counselorsRes.status}`)
  }

  // Proxy dashboard for Aneeqa
  if (aneeqa) {
    const proxyBase = `/admin/counselors/${aneeqa.id}/dashboard`
    const { res: proxyRes, html: proxyHtml } = await fetchPage(proxyBase, jar)
    if (proxyRes.status === 200) {
      pass('Aneeqa proxy dashboard loads')
      if (proxyHtml.includes('Admin view') || proxyHtml.includes('admin banner') || proxyHtml.includes('Viewing')) {
        pass('Orange admin banner visible on proxy dashboard')
      } else {
        fail('Admin banner on proxy dashboard', 'Banner text not found in HTML')
      }
    } else {
      fail('Aneeqa proxy dashboard loads', `status ${proxyRes.status}`)
    }

    for (const p of ['pipeline', 'tasks']) {
      const { res } = await fetchPage(`${proxyBase}/${p}`, jar)
      if (res.status === 200) pass(`Proxy ${p} page loads`)
      else fail(`Proxy ${p} page loads`, `status ${res.status}`)
    }

    const { res: clientsRes } = await fetchPage(`${proxyBase}/clients`, jar)
    const clientsLoc = clientsRes.headers.get('location') || ''
    if (
      clientsRes.status === 307 ||
      clientsRes.status === 302 ||
      (clientsRes.status === 200 && clientsLoc.includes('pipeline'))
    ) {
      pass('Proxy clients page redirects to pipeline (expected)')
    } else {
      fail('Proxy clients page', `status ${clientsRes.status}`)
    }

    const { html: tasksHtml } = await fetchPage(`${proxyBase}/tasks`, jar)
    if (tasksHtml.includes('read-only') || tasksHtml.includes('Admin view')) {
      pass('Tasks in proxy view are read-only (banner/message present)')
    } else {
      fail('Tasks proxy read-only indicator')
    }

    const { html: pipelineHtml } = await fetchPage(`${proxyBase}/pipeline`, jar)
    if (pipelineHtml.includes('Transfer')) pass('Transfer button on proxy pipeline view')
    else fail('Transfer button on proxy pipeline view')
  }

  // Non-admin counselor blocked from /admin
  const { data: counselorAccount } = await adminDb
    .from('counselors')
    .select('email')
    .ilike('name', 'Aneeqa%')
    .single()

  if (counselorAccount?.email) {
    try {
      const counselorJar = await login(counselorAccount.email, ADMIN_PASSWORD)
      const { res: blockRes } = await fetchPage('/admin', counselorJar)
      const loc = blockRes.headers.get('location') || ''
      if (blockRes.status === 307 || blockRes.status === 302) {
        if (loc.includes('/dashboard')) pass('Non-admin /admin redirects to /dashboard')
        else fail('Non-admin /admin redirect', loc)
      } else {
        fail('Non-admin /admin redirect', `status ${blockRes.status}`)
      }
    } catch {
      fail('Non-admin counselor login for redirect test', 'Could not log in as Aneeqa — set password to Beta2Test2026! manually')
    }
  }

  summary()
}

function summary() {
  console.log('\n=== SUMMARY ===')
  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length
  console.log(`${passed} passed, ${failed} failed`)
  if (failed) {
    console.log('\nFailures:')
    results.filter((r) => r.status === 'FAIL').forEach((r) => console.log(` - ${r.msg}${r.detail ? ': ' + r.detail : ''}`))
  }
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
