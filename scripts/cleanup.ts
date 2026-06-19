/**
 * ACE — Database Cleanup Script
 * Keeps: hashaamahmed496@gmail.com + any role='admin' account
 * Deletes: all other counselors and their clients + all related data
 *
 * Run with: npx tsx --env-file=.env.local scripts/cleanup.ts
 */

import { createClient } from '@supabase/supabase-js'

// Credentials come from environment — run with:
//   npx tsx --env-file=.env.local scripts/cleanup.ts

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('❌ Missing env vars. Run with:')
  console.error('   npx tsx --env-file=.env.local scripts/cleanup.ts')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  console.log('═══════════════════════════════════════')
  console.log('  ACE Database Cleanup')
  console.log('═══════════════════════════════════════\n')

  // ── 1. Fetch all counselors ────────────────────────────────────────────
  const { data: allCounselors, error: fetchErr } = await supabase
    .from('counselors')
    .select('id, name, email, role')

  if (fetchErr || !allCounselors) {
    console.error('Failed to fetch counselors:', fetchErr)
    process.exit(1)
  }

  console.log(`Found ${allCounselors.length} counselor(s):\n`)
  allCounselors.forEach((c) =>
    console.log(`  [${c.role}] ${c.name} — ${c.email} (${c.id})`)
  )

  // ── 2. Separate keep vs delete ─────────────────────────────────────────
  const keepIds = allCounselors
    .filter(
      (c) =>
        c.email === 'hashaamahmed496@gmail.com' ||
        c.role === 'admin'
    )
    .map((c) => c.id)

  const deleteIds = allCounselors
    .filter((c) => !keepIds.includes(c.id))
    .map((c) => c.id)

  console.log(`\n✅ Keeping (${keepIds.length}):`)
  allCounselors
    .filter((c) => keepIds.includes(c.id))
    .forEach((c) => console.log(`   ${c.name} — ${c.email}`))

  console.log(`\n🗑️  Deleting (${deleteIds.length}):`)
  allCounselors
    .filter((c) => deleteIds.includes(c.id))
    .forEach((c) => console.log(`   ${c.name} — ${c.email}`))

  if (deleteIds.length === 0) {
    console.log('\nNothing to delete. Done.')
    process.exit(0)
  }

  // ── 3. Find all client IDs belonging to counselors being deleted ───────
  const { data: clientsToDelete } = await supabase
    .from('clients')
    .select('id, name')
    .in('counselor_id', deleteIds)

  const clientIds = (clientsToDelete ?? []).map((c) => c.id)

  console.log(`\n📋 Clients to delete: ${clientIds.length}`)
  ;(clientsToDelete ?? []).forEach((c) =>
    console.log(`   ${c.name} (${c.id})`)
  )

  if (clientIds.length === 0) {
    console.log('   (none)')
  }

  console.log('\nStarting deletion...\n')

  // ── 4. Delete client-related data in safe order ────────────────────────
  if (clientIds.length > 0) {
    const clientTables = [
      'conversations',
      'ai_profiles',
      'specialist_outputs',
      'response_tracking',
      'panic_events',
      'profile_update_requests',
      'counselor_objectives',
      'behavioral_analyses',
    ]

    for (const table of clientTables) {
      const { error, count } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .in('client_id', clientIds)

      if (error && !error.message.includes('does not exist')) {
        console.error(`  ✗ ${table}:`, error.message)
      } else {
        console.log(`  ✓ ${table}: deleted ${count ?? 0} row(s)`)
      }
    }

    // Delete clients themselves
    const { error: clientErr, count: clientCount } = await supabase
      .from('clients')
      .delete({ count: 'exact' })
      .in('id', clientIds)

    if (clientErr) {
      console.error('  ✗ clients:', clientErr.message)
    } else {
      console.log(`  ✓ clients: deleted ${clientCount ?? 0} row(s)`)
    }
  }

  // ── 5. Delete counselor-related data ──────────────────────────────────
  const counselorTables = [
    'counselor_status',
    'notifications',
    'counselor_objectives',
    'response_tracking',
  ]

  for (const table of counselorTables) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .in('counselor_id', deleteIds)

    if (error && !error.message.includes('does not exist')) {
      console.error(`  ✗ ${table}:`, error.message)
    } else {
      console.log(`  ✓ ${table}: deleted ${count ?? 0} row(s)`)
    }
  }

  // ── 6. Delete the counselors themselves ────────────────────────────────
  const { error: counselorErr, count: counselorCount } = await supabase
    .from('counselors')
    .delete({ count: 'exact' })
    .in('id', deleteIds)

  if (counselorErr) {
    console.error('  ✗ counselors:', counselorErr.message)
  } else {
    console.log(`  ✓ counselors: deleted ${counselorCount ?? 0} row(s)`)
  }

  // ── 7. Summary ────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════')
  console.log('  Cleanup complete.')
  console.log('  Remaining: hashaam + admin only.')
  console.log('  Run the seed script next to generate test data.')
  console.log('═══════════════════════════════════════\n')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
