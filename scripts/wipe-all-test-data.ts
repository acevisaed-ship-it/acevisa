/**
 * ACE — Full Test Data Wipe
 *
 * Removes EVERY counselor (including CEO/Admin/Receptionist roles) and EVERY
 * client, plus all data tied to them: conversations, documents, tasks, meetings,
 * complaints, activity logs, notifications, HR/finance records, team hub chat,
 * and (by default) campaigns / products / commission config.
 *
 * SCHEMA NOTE — business-config tables that *reference* counselors:
 *   - campaigns.default_counselor_id  → FK to counselors (no CASCADE; just a default assignee)
 *   - product_commission_rules.counselor_id → ON DELETE CASCADE deletes the *rule row*
 *     when that counselor is deleted — NOT the product itself
 *   - products has NO counselor_id — the catalog is independent config
 *   - team_commission_policy / commission_policy_rules — org-level config, not per-client
 *
 * Because go-live confirmed those rows are also throwaway test/seed data, they are
 * wiped by default. Pass --keep-business-config to keep the product catalog,
 * campaigns, and commission templates while still wiping people + operational data.
 *
 * Kept untouched always: `branches`, `hr_policies`, `portal_settings`
 * Kept with counselor ref nulled: `knowledge_base.added_by`
 * (and campaigns.default_counselor_id when --keep-business-config is set)
 *
 * Deletes Supabase Auth users too, then recreates ONE fresh CEO account.
 *
 * SAFETY: dry-run by default. Nothing is removed until --confirm.
 * Take a Supabase backup first. There is no undo.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/wipe-all-test-data.ts
 *   npx tsx --env-file=.env.local scripts/wipe-all-test-data.ts --confirm
 *   npx tsx --env-file=.env.local scripts/wipe-all-test-data.ts --keep-business-config --confirm
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('❌ Missing env vars. Run with:')
  console.error('   npx tsx --env-file=.env.local scripts/wipe-all-test-data.ts')
  process.exit(1)
}

const supabase = createClient(url, key)
const CONFIRM = process.argv.includes('--confirm')
const KEEP_BUSINESS_CONFIG = process.argv.includes('--keep-business-config')

// Email to recreate as the single surviving CEO account after the wipe.
// Change this before running --confirm if you want a different address.
const NEW_CEO_EMAIL = 'ceo@aceyourvisa.com'
const NEW_CEO_NAME = 'CEO'

// Client-scoped operational data (delete children before parents where nested).
const CLIENT_SCOPED_TABLES = [
  'application_updates',
  'applications',
  'conversations',
  'ai_profiles',
  'ai_behavioral_notes',
  'escalations',
  'documents',
  'agreements',
  'messages_log',
  'complaints',
  'profile_update_requests',
  'client_correction_requests',
  'panic_events',
  'specialist_outputs',
  'student_activity_log',
  'scheduled_emails',
]

// Counselor-scoped operational data (no client_id, or primarily staff-owned).
const COUNSELOR_SCOPED_TABLES = [
  'hrm_records',
  'counselor_status',
  'counselor_email_accounts',
  'counselor_objectives',
  'attendance_records',
  'leave_applications',
  // Finance: children before parents (payments → invoices → deals)
  'payments',
  'invoices',
  'deals',
  'expenses',
  'notifications',
]

// Business-config tables that reference counselors but are NOT client data.
// Wiped by default (confirmed as test/seed). Skipped with --keep-business-config.
// Order: child product tables first, then products, then other config.
const BUSINESS_CONFIG_TABLES = [
  'product_commission_rules', // counselor_id ON DELETE CASCADE — rules only, not products
  'product_vendors',
  'product_payment_stages',
  'products',                 // catalog — no counselor_id
  'campaigns',                // default_counselor_id is assignment config, not client data
  'commission_policy_rules',
  'commission_rules',
  'team_commission_policy',
]

// Tables referencing BOTH client_id and counselor_id — wipe entirely.
const MIXED_TABLES = ['meetings', 'tasks', 'task_actions', 'response_tracking', 'activity_logs']

// Team Hub
const TEAM_HUB_TABLES = ['direct_messages', 'team_messages', 'team_post_replies', 'team_posts']

// Kept rows — null counselor FKs so they don't dangle after counselors wipe.
const KEEP_ROWS_NULL_COUNSELOR_REF: { table: string; column: string }[] = [
  { table: 'knowledge_base', column: 'added_by' },
]

async function countRows(table: string): Promise<number | null> {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) return null
  return count ?? 0
}

async function deleteAllRows(table: string): Promise<{ ok: boolean; count: number; message?: string }> {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: 'exact' })
    .not('id', 'is', null)
  if (error) {
    if (error.message.includes('does not exist') || error.code === '42P01') {
      return { ok: true, count: 0, message: 'table not found — skipped' }
    }
    return { ok: false, count: 0, message: error.message }
  }
  return { ok: true, count: count ?? 0 }
}

function tablesToWipe(): string[] {
  const base = [
    ...CLIENT_SCOPED_TABLES,
    ...COUNSELOR_SCOPED_TABLES,
    ...MIXED_TABLES,
    ...TEAM_HUB_TABLES,
  ]
  if (!KEEP_BUSINESS_CONFIG) base.push(...BUSINESS_CONFIG_TABLES)
  return base
}

async function main() {
  console.log('═══════════════════════════════════════')
  console.log('  ACE — FULL TEST DATA WIPE')
  console.log(`  Mode: ${CONFIRM ? 'LIVE — WILL DELETE' : 'PREVIEW ONLY (dry run)'}`)
  console.log(
    `  Business config: ${KEEP_BUSINESS_CONFIG ? 'KEEP (products/campaigns/commission)' : 'WIPE (default)'}`
  )
  console.log('═══════════════════════════════════════\n')

  const { data: allCounselors } = await supabase.from('counselors').select('id, name, email, role')
  const { data: allClients } = await supabase.from('clients').select('id, name, email, auth_user_id')

  console.log(`Counselors (all roles) to remove: ${allCounselors?.length ?? 0}`)
  ;(allCounselors ?? []).forEach((c) => console.log(`   [${c.role}] ${c.name} — ${c.email}`))

  console.log(`\nClients to remove: ${allClients?.length ?? 0}`)
  if ((allClients?.length ?? 0) > 10) {
    console.log(`   (${allClients!.length} total — showing first 10)`)
  }
  ;(allClients ?? []).slice(0, 10).forEach((c) => console.log(`   ${c.name} — ${c.email ?? 'no email'}`))

  console.log('\nRow counts — operational / people-linked tables:')
  for (const table of [
    ...CLIENT_SCOPED_TABLES,
    ...COUNSELOR_SCOPED_TABLES,
    ...MIXED_TABLES,
    ...TEAM_HUB_TABLES,
  ]) {
    const n = await countRows(table)
    console.log(`   ${table.padEnd(28)} ${n === null ? '—' : n}`)
  }

  console.log('\nRow counts — business-config tables (NOT client data; see schema note):')
  for (const table of BUSINESS_CONFIG_TABLES) {
    const n = await countRows(table)
    const action = KEEP_BUSINESS_CONFIG ? 'KEEP' : 'WIPE'
    console.log(`   ${table.padEnd(28)} ${n === null ? '—' : String(n).padStart(4)}  → ${action}`)
  }

  console.log('\nAlways kept untouched: branches, hr_policies, portal_settings')
  console.log('Kept but counselor reference cleared: knowledge_base.added_by')
  if (KEEP_BUSINESS_CONFIG) {
    console.log('Also cleared if present: campaigns.default_counselor_id')
  }

  if (!CONFIRM) {
    console.log('\n─────────────────────────────────────────')
    console.log('This was a PREVIEW. Nothing was deleted.')
    console.log('1. Take a Supabase backup first.')
    console.log('2. Review counts carefully.')
    console.log('3. Re-run with --confirm to delete.')
    console.log('   Optional: --keep-business-config to keep products/campaigns/commission templates.')
    console.log('─────────────────────────────────────────\n')
    process.exit(0)
  }

  console.log('\n⚠️  --confirm passed. Deleting for real. This cannot be undone.\n')

  const clientAuthIds = (allClients ?? []).map((c) => c.auth_user_id).filter(Boolean) as string[]
  const counselorEmails = (allCounselors ?? []).map((c) => c.email).filter(Boolean) as string[]

  for (const table of tablesToWipe()) {
    const result = await deleteAllRows(table)
    console.log(
      result.ok
        ? `  ✓ ${table}: deleted ${result.count} row(s)${result.message ? ` (${result.message})` : ''}`
        : `  ✗ ${table}: ${result.message}`
    )
  }

  const nullRefs = [...KEEP_ROWS_NULL_COUNSELOR_REF]
  if (KEEP_BUSINESS_CONFIG) {
    nullRefs.push({ table: 'campaigns', column: 'default_counselor_id' })
  }
  for (const { table, column } of nullRefs) {
    const { error, count } = await supabase.from(table).update({ [column]: null }).not(column, 'is', null)
    console.log(
      error
        ? `  ✗ ${table}.${column}: ${error.message}`
        : `  ✓ ${table}.${column}: cleared on ${count ?? 0} row(s)`
    )
  }

  const clientsResult = await deleteAllRows('clients')
  console.log(
    clientsResult.ok
      ? `  ✓ clients: deleted ${clientsResult.count} row(s)`
      : `  ✗ clients: ${clientsResult.message}`
  )

  const counselorsResult = await deleteAllRows('counselors')
  console.log(
    counselorsResult.ok
      ? `  ✓ counselors: deleted ${counselorsResult.count} row(s)`
      : `  ✗ counselors: ${counselorsResult.message}`
  )

  console.log('\nDeleting Supabase Auth accounts...')
  for (const authId of clientAuthIds) {
    const { error } = await supabase.auth.admin.deleteUser(authId)
    console.log(error ? `  ✗ auth user ${authId}: ${error.message}` : `  ✓ auth user ${authId} deleted`)
  }

  const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  for (const email of counselorEmails) {
    const match = authList?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (!match) continue
    const { error } = await supabase.auth.admin.deleteUser(match.id)
    console.log(error ? `  ✗ auth user ${email}: ${error.message}` : `  ✓ auth user ${email} deleted`)
  }

  console.log(`\nRecreating a single CEO account: ${NEW_CEO_EMAIL}`)
  const tempPassword = Array.from({ length: 16 }, () =>
    'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 54)]
  ).join('')

  const { data: newAuthUser, error: newAuthErr } = await supabase.auth.admin.createUser({
    email: NEW_CEO_EMAIL,
    password: tempPassword,
    email_confirm: true,
  })

  if (newAuthErr || !newAuthUser.user) {
    console.error('  ✗ Failed to create new CEO auth user:', newAuthErr?.message)
  } else {
    const { error: insertErr } = await supabase.from('counselors').insert({
      name: NEW_CEO_NAME,
      email: NEW_CEO_EMAIL,
      role: 'ceo',
      branch_id: null,
      status: 'active',
    })
    if (insertErr) {
      console.error('  ✗ Failed to create counselors row for new CEO:', insertErr.message)
    } else {
      console.log('  ✓ New CEO account created.')
      console.log(`\n  ┌─────────────────────────────────────────┐`)
      console.log(`  │  Login: ${NEW_CEO_EMAIL}`)
      console.log(`  │  Temp password: ${tempPassword}`)
      console.log(`  │  Change this password immediately after logging in.`)
      console.log(`  └─────────────────────────────────────────┘`)
    }
  }

  console.log('\n═══════════════════════════════════════')
  console.log('  Wipe complete.')
  console.log('═══════════════════════════════════════\n')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
