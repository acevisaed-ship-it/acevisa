/**
 * Seed go-live staff profiles (Auth + counselors rows) on @aceyourvisa.com.
 *
 * Idempotent: skips emails that already exist in counselors / Auth.
 * Prints temporary passwords once for newly created accounts.
 *
 *   npx tsx --env-file=.env.local scripts/seed-staff-profiles.ts
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

type StaffSeed = {
  name: string
  email: string
  role: 'ceo' | 'admin' | 'counselor' | 'receptionist'
  branch: 'main' | 'none'
}

const STAFF: StaffSeed[] = [
  { name: 'CEO', email: 'ceo@aceyourvisa.com', role: 'ceo', branch: 'none' },
  { name: 'Admin', email: 'admin@aceyourvisa.com', role: 'admin', branch: 'main' },
  { name: 'Arooj', email: 'arooj@aceyourvisa.com', role: 'counselor', branch: 'main' },
  { name: 'Aneeqa', email: 'aneeqa@aceyourvisa.com', role: 'counselor', branch: 'main' },
  { name: 'Osama', email: 'osama@aceyourvisa.com', role: 'counselor', branch: 'main' },
  { name: 'Marrium', email: 'marrium@aceyourvisa.com', role: 'counselor', branch: 'main' },
  { name: 'Front Desk', email: 'fd@aceyourvisa.com', role: 'receptionist', branch: 'main' },
]

function tempPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

async function main() {
  const { data: branch } = await supabase
    .from('branches')
    .select('id, name')
    .eq('name', 'Main Branch')
    .maybeSingle()

  if (!branch) {
    console.error('Main Branch not found — create a branch first')
    process.exit(1)
  }

  console.log(`Using branch: ${branch.name} (${branch.id})\n`)

  const created: { role: string; name: string; email: string; password: string }[] = []
  const skipped: string[] = []

  const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const authByEmail = new Map(
    (authList?.users ?? []).map((u) => [u.email?.toLowerCase() ?? '', u.id])
  )

  for (const person of STAFF) {
    const email = person.email.toLowerCase()
    const { data: existingRow } = await supabase
      .from('counselors')
      .select('id, email, role')
      .eq('email', email)
      .maybeSingle()

    if (existingRow) {
      skipped.push(`${email} (counselors row exists as ${existingRow.role})`)
      continue
    }

    let authId = authByEmail.get(email)
    const password = tempPassword()

    if (!authId) {
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (authErr || !authUser.user) {
        console.error(`✗ Auth create failed for ${email}:`, authErr?.message)
        continue
      }
      authId = authUser.user.id
    } else {
      // Auth exists without counselors row — reset password so login is known
      const { error: updErr } = await supabase.auth.admin.updateUserById(authId, {
        password,
        email_confirm: true,
      })
      if (updErr) {
        console.error(`✗ Auth password reset failed for ${email}:`, updErr.message)
        continue
      }
    }

    const { error: insertErr } = await supabase.from('counselors').insert({
      name: person.name,
      email,
      role: person.role,
      branch_id: person.branch === 'main' ? branch.id : null,
      status: 'active',
    })

    if (insertErr) {
      console.error(`✗ counselors insert failed for ${email}:`, insertErr.message)
      continue
    }

    created.push({ role: person.role, name: person.name, email, password })
    console.log(`✓ Created [${person.role}] ${person.name} <${email}>`)
  }

  console.log('\n═══════════════════════════════════════')
  if (created.length) {
    console.log('Temporary passwords (copy now — shown once):')
    console.log('───────────────────────────────────────')
    for (const c of created) {
      console.log(`${c.role.padEnd(14)} ${c.email.padEnd(32)} ${c.password}`)
    }
    console.log('───────────────────────────────────────')
    console.log('Have each person change their password after first login.')
  } else {
    console.log('No new accounts created.')
  }
  if (skipped.length) {
    console.log('\nSkipped:')
    skipped.forEach((s) => console.log(`  - ${s}`))
  }
  console.log('═══════════════════════════════════════\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
