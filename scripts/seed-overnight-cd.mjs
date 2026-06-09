/**
 * OVERNIGHT C + D — Knowledge base seed + Phase 4 finance mock data
 * Run: node scripts/seed-overnight-cd.mjs
 */
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

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const ADMIN_ID = '2365c12c-8ad8-4cff-a45d-98137019f1d2'
const HASHAAM_ID = '55403943-35db-4c2b-94fe-02750ed04352'
const ANEEQA_ID = '45f23418-fbb7-472c-b9e2-bddc7eac40ff'

const KB_ENTRIES = [
  ['Study Visa', 'UK blocked account requirement', 'UK student visas require a bank statement showing you can cover your first years tuition plus 9 months living costs at 1334 GBP per month. This must be shown for 28 consecutive days before applying.'],
  ['Study Visa', 'Germany blocked account 2025', 'Germany requires a blocked account of 11208 EUR to show you can support yourself for one year. The money is released monthly after arrival. This is separate from tuition and is a visa requirement.'],
  ['Study Visa', 'Canada study permit processing time', 'Canada study permit processing from Pakistan currently takes 8 to 16 weeks on average. Student Direct Stream SDS is not available from Pakistan. Apply as early as possible before your intake.'],
  ['Study Visa', 'Australia student visa subclass 500', 'Australia student visa requires proof of enrollment, financial capacity, English proficiency, and genuine temporary entrant GTE statement. Processing takes 4 to 8 weeks. Health insurance OSHC is mandatory.'],
  ['Study Visa', 'Hungary upfront university fee', 'Most Hungarian universities require full first semester or first year tuition to be paid before the visa is issued. This is 3000 to 8000 EUR depending on the university, paid before you have a visa guarantee.'],
  ['Work Abroad', 'UAE work visa requirements', 'UAE employment visa is sponsored by the employer. You need a valid job offer first. Processing takes 2 to 4 weeks. No IELTS required but most employers require English proficiency.'],
  ['Work Abroad', 'Canada work permit pathways', 'Canada work permits include employer-specific work permits requiring LMIA, and open work permits for spouses of skilled workers or international students. Processing varies from 2 weeks to 6 months.'],
  ['Language & IELTS', 'IELTS minimum scores by country', 'UK universities typically require IELTS 6.0 to 6.5. Canada requires 6.0 to 6.5 for most programs. Germany accepts IELTS 6.0 for most public universities. Australia requires 6.0 to 6.5 for undergraduate and 6.5 for postgraduate.'],
  ['Language & IELTS', 'IELTS preparation timeline', 'Most students improve by 0.5 to 1 band per month of focused preparation. Plan for 2 to 3 months minimum if starting from scratch. ACE offers IELTS coaching as a standalone service before the visa process begins.'],
  ['General', 'ACE service fee structure', 'ACE charges a service fee that is split into stages. An initial consultation is free with no commitment. Service fees are charged only when you decide to proceed. No upfront full payment is required. All costs are disclosed before you sign anything.'],
]

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

async function seedKnowledgeBase() {
  const { data: existing } = await db.from('knowledge_base').select('topic')
  const existingTopics = new Set((existing ?? []).map((e) => e.topic))

  const toInsert = KB_ENTRIES.filter(([, topic]) => !existingTopics.has(topic)).map(
    ([category, topic, answer]) => ({ category, topic, answer, is_active: true })
  )

  if (toInsert.length === 0) {
    console.log(`Knowledge base: ${existing?.length ?? 0} entries already present`)
    return
  }

  const { error } = await db.from('knowledge_base').insert(toInsert)
  if (error) throw new Error(`Knowledge base seed failed: ${error.message}`)
  console.log(`Knowledge base: ${toInsert.length} entries inserted (${(existing?.length ?? 0) + toInsert.length} total)`)
}

async function seedFinance() {
  const tables = ['deals', 'invoices', 'expenses', 'commission_rules']
  for (const table of tables) {
    const { error } = await db.from(table).select('id').limit(1)
    if (error) {
      console.error(`\nTable "${table}" missing. Run supabase/phase4-finance.sql in Supabase SQL Editor first.`)
      console.error(`Error: ${error.message}`)
      process.exit(1)
    }
  }

  await db.from('commission_rules').upsert(
    [
      { counselor_id: HASHAAM_ID, commission_rate: 12, base_salary: 80000 },
      { counselor_id: ANEEQA_ID, commission_rate: 10, base_salary: 75000 },
    ],
    { onConflict: 'counselor_id' }
  )

  await db.from('deals').upsert(
    [
      {
        id: 'd4000001-0000-0000-0000-000000000001',
        client_id: 'a1000001-0000-0000-0000-000000000001',
        counselor_id: HASHAAM_ID,
        service_type: 'study_visa',
        target_country: 'UK',
        deal_value: 95000,
        stage: 'proposal',
        expected_close_date: daysFromNow(30),
      },
      {
        id: 'd4000001-0000-0000-0000-000000000002',
        client_id: 'a1000001-0000-0000-0000-000000000003',
        counselor_id: ANEEQA_ID,
        service_type: 'study_visa',
        target_country: 'Germany',
        deal_value: 120000,
        stage: 'agreement_signed',
        signed_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        expected_close_date: daysFromNow(60),
      },
      {
        id: 'd4000001-0000-0000-0000-000000000003',
        client_id: 'a1000001-0000-0000-0000-000000000002',
        counselor_id: HASHAAM_ID,
        service_type: 'language_ielts',
        target_country: 'N/A',
        deal_value: 25000,
        stage: 'lead',
        expected_close_date: daysFromNow(14),
      },
    ],
    { onConflict: 'id' }
  )

  await db.from('invoices').upsert(
    [
      {
        id: 'e5000001-0000-0000-0000-000000000001',
        invoice_number: 'ACE-2025-001',
        client_id: 'a1000001-0000-0000-0000-000000000003',
        deal_id: 'd4000001-0000-0000-0000-000000000002',
        counselor_id: ANEEQA_ID,
        line_items: [
          { description: 'Germany Study Visa Service Fee - Stage 1', amount: 40000 },
          { description: 'Documentation Processing', amount: 15000 },
        ],
        subtotal: 55000,
        total: 55000,
        status: 'sent',
        due_date: daysFromNow(7),
      },
      {
        id: 'e5000001-0000-0000-0000-000000000002',
        invoice_number: 'ACE-2025-002',
        client_id: 'a1000001-0000-0000-0000-000000000002',
        deal_id: 'd4000001-0000-0000-0000-000000000003',
        counselor_id: HASHAAM_ID,
        line_items: [{ description: 'IELTS Preparation Course - 2 months', amount: 25000 }],
        subtotal: 25000,
        total: 25000,
        status: 'draft',
        due_date: daysFromNow(14),
      },
    ],
    { onConflict: 'id' }
  )

  const { count: expenseCount } = await db.from('expenses').select('*', { count: 'exact', head: true })
  if ((expenseCount ?? 0) < 5) {
    const { error } = await db.from('expenses').insert([
      { category: 'salary', description: 'June 2025 salary - Hashaam', amount: 80000, paid_at: daysAgo(5), recorded_by: ADMIN_ID },
      { category: 'salary', description: 'June 2025 salary - Aneeqa', amount: 75000, paid_at: daysAgo(5), recorded_by: ADMIN_ID },
      { category: 'marketing', description: 'Meta ads - UK campaign June', amount: 35000, paid_at: daysAgo(10), recorded_by: ADMIN_ID },
      { category: 'office', description: 'Office rent June 2025', amount: 45000, paid_at: daysAgo(1), recorded_by: ADMIN_ID },
      { category: 'tools', description: 'Vercel + Supabase + Anthropic APIs', amount: 8500, paid_at: daysAgo(3), recorded_by: ADMIN_ID },
    ])
    if (error) throw new Error(`Expenses seed failed: ${error.message}`)
    console.log('Expenses: 5 entries inserted')
  } else {
    console.log(`Expenses: ${expenseCount} entries already present`)
  }

  const { count: dealCount } = await db.from('deals').select('*', { count: 'exact', head: true })
  const { count: invoiceCount } = await db.from('invoices').select('*', { count: 'exact', head: true })
  console.log(`Finance: ${dealCount} deals, ${invoiceCount} invoices`)
}

console.log('OVERNIGHT C + D — seeding knowledge base + finance data...\n')
await seedKnowledgeBase()
await seedFinance()
console.log('\nDone.')
