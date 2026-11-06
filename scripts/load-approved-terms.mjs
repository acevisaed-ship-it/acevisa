// Loads owner-approved terms wording into unpublished drafts.
// Does not publish. Sending still needs a CEO publish, and remaining
// [brackets] are asked for when staff send an invoice.
//
// Usage:
//   node scripts/load-approved-terms.mjs

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function loadEnvLocal() {
  const envPath = path.join(repoRoot, '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

function readPaste(name) {
  return readFileSync(path.join(repoRoot, 'docs', 'terms-paste-ready', name), 'utf-8').trim()
}

function policyFileForProduct(name) {
  const n = name.toLowerCase()
  if (n.includes('study')) return '02-study-visa-policy.txt'
  if (n.includes('visit')) return '03-visit-visa-policy.txt'
  if (
    n.includes('language') ||
    n.includes('voucher') ||
    n.includes('ielts') ||
    n.includes('pte') ||
    n.includes('toefl')
  ) {
    return '05-language-tests-policy.txt'
  }
  return '04-other-visas-policy.txt'
}

function policyTitleForProduct(name) {
  const n = name.toLowerCase()
  if (n.includes('study')) return 'Study Visa Services'
  if (n.includes('visit')) return 'Visit Visa Services'
  if (
    n.includes('language') ||
    n.includes('voucher') ||
    n.includes('ielts') ||
    n.includes('pte') ||
    n.includes('toefl')
  ) {
    return 'Language Tests, Vouchers and Classes'
  }
  return 'Other Visas, Residence and Document-Preparation Services'
}

async function upsertDraft(supabase, { scope, productId, title, body }) {
  let query = supabase
    .from('terms_documents')
    .select('id, version, published_at')
    .eq('scope', scope)
    .is('published_at', null)
  query = productId ? query.eq('product_id', productId) : query.is('product_id', null)

  const { data: drafts, error: draftError } = await query.order('version', { ascending: false }).limit(1)
  if (draftError) throw new Error(draftError.message)

  const draft = drafts?.[0]
  if (draft) {
    const { error } = await supabase
      .from('terms_documents')
      .update({ title, body })
      .eq('id', draft.id)
    if (error) throw new Error(error.message)
    return { action: 'updated', id: draft.id, version: draft.version }
  }

  let versionQuery = supabase.from('terms_documents').select('version').eq('scope', scope)
  versionQuery = productId
    ? versionQuery.eq('product_id', productId)
    : versionQuery.is('product_id', null)
  const { data: latest } = await versionQuery.order('version', { ascending: false }).limit(1)
  const version = (latest?.[0]?.version ?? 0) + 1

  const { data, error } = await supabase
    .from('terms_documents')
    .insert({
      scope,
      product_id: productId,
      title,
      body,
      version,
      is_active: false,
    })
    .select('id, version')
    .single()
  if (error) throw new Error(error.message)
  return { action: 'inserted', id: data.id, version: data.version }
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const general = await upsertDraft(supabase, {
  scope: 'general',
  productId: null,
  title: 'Terms of Service',
  body: readPaste('01-general-terms.txt'),
})
console.log('general', general)

const { data: products, error: productsError } = await supabase
  .from('products')
  .select('id, name')
  .order('name')
if (productsError) {
  console.error(productsError.message)
  process.exit(1)
}

for (const product of products ?? []) {
  const file = policyFileForProduct(product.name)
  const result = await upsertDraft(supabase, {
    scope: 'product',
    productId: product.id,
    title: policyTitleForProduct(product.name),
    body: readPaste(file),
  })
  console.log(product.name, file, result)
}
