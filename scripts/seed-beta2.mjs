import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const TEST_PASSWORD = 'Beta2Test2026!'

async function seed() {
  console.log('Seeding Beta 2 test data...\n')

  const { data: aneeqa } = await admin.from('counselors').select('id').ilike('name', 'Aneeqa%').single()
  const counselorAroojId = (
    await admin.from('counselors').select('id').ilike('name', 'Arooj%').single()
  ).data?.id

  if (!aneeqa?.id || !counselorAroojId) {
    console.error('Missing Aneeqa or Arooj counselor - cannot seed')
    process.exit(1)
  }

  const unassigned = [
    { name: 'Zara', phone: '03001234001', language: 'english', city: 'Lahore', ad_source: 'uk-study-2026', qualification_score: 72 },
    { name: 'Imran', phone: '03001234002', language: 'english', city: 'Karachi', ad_source: 'ca-jobs-2026', qualification_score: 65 },
    { name: 'Maryam', phone: '03001234003', language: 'urdu', city: 'Islamabad', ad_source: 'ielts-2026', qualification_score: 58 },
    { name: 'Tariq', phone: '03001234004', language: 'english', city: 'Rawalpindi', ad_source: 'direct', qualification_score: 45 },
  ]

  for (const c of unassigned) {
    const { data: existing } = await admin.from('clients').select('id').eq('name', c.name).maybeSingle()
    if (existing) {
      await admin.from('clients').update({ counselor_id: null, ...c }).eq('id', existing.id)
      console.log(`Updated unassigned: ${c.name}`)
    } else {
      await admin.from('clients').insert({ ...c, counselor_id: null, pipeline_stage: 1 })
      console.log(`Created unassigned: ${c.name}`)
    }
  }

  const { data: hinaExisting } = await admin.from('clients').select('id').eq('name', 'Hina').maybeSingle()
  let hinaId = hinaExisting?.id
  if (hinaId) {
    await admin.from('clients').update({
      counselor_id: counselorAroojId, city: 'Lahore', pipeline_stage: 2, qualification_score: 80,
    }).eq('id', hinaId)
  } else {
    const { data: hina } = await admin.from('clients').insert({
      name: 'Hina', phone: '03001234005', language: 'english', city: 'Lahore',
      counselor_id: counselorAroojId, ad_source: 'uk-study-2026', pipeline_stage: 2, qualification_score: 80,
    }).select('id').single()
    hinaId = hina?.id
  }
  console.log('Hina assigned to Arooj')

  for (const [name, phone, city] of [['Sana', '03001234006', 'Lahore'], ['Ali', '03001234007', 'Karachi']]) {
    const { data: ex } = await admin.from('clients').select('id').eq('name', name).maybeSingle()
    let clientId = ex?.id
    if (!clientId) {
      const { data: created } = await admin.from('clients').insert({
        name, phone, language: 'english', city, counselor_id: aneeqa.id, ad_source: 'direct', pipeline_stage: 3,
      }).select('id').single()
      clientId = created?.id
    }
    if (clientId) {
      const proposed = name === 'Sana' ? 'Islamabad' : 'Faisalabad'
      const { data: req } = await admin.from('profile_update_requests').select('id')
        .eq('client_id', clientId).eq('status', 'pending').maybeSingle()
      if (!req) {
        const triggered = `I moved to ${proposed}`
        await admin.from('profile_update_requests').insert({
          client_id: clientId,
          triggered_by_message: triggered,
          proposed_changes: { city: triggered },
          reviewed_fields: {},
          status: 'pending',
        })
      }
      console.log(`Profile update pending for ${name}`)
    }
  }

  if (hinaId) {
    const { data: task } = await admin.from('tasks').select('id')
      .eq('client_id', hinaId).eq('counselor_id', counselorAroojId).maybeSingle()
    if (!task) {
      await admin.from('tasks').insert({
        counselor_id: counselorAroojId, client_id: hinaId,
        task_text: 'Follow up with Hina on UK application',
        due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
        status: 'pending',
      })
      console.log('Created open task for Arooj')
    }
  }

  const { data: users } = await admin.auth.admin.listUsers()
  const resetEmails = ['admin@acevisa.co']
  const { data: counselorRows } = await admin.from('counselors').select('email').ilike('name', 'Aneeqa%')
  if (counselorRows?.[0]?.email) resetEmails.push(counselorRows[0].email)

  for (const email of resetEmails) {
    const user = users?.users?.find((u) => u.email === email)
    if (user) {
      await admin.auth.admin.updateUserById(user.id, { password: TEST_PASSWORD })
      console.log(`Password reset: ${email}`)
    }
  }
  console.log(`\nTest password: ${TEST_PASSWORD}`)

  console.log('\nSeed complete.')
}

seed().catch(console.error)
