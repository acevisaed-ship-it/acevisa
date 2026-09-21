// One-time seed: uploads the country presentation decks + Portugal D7
// guidebook from docs/country-presentations/ into the private
// 'ceo-knowledge-base' Supabase Storage bucket and inserts a matching row
// per file in ceo_knowledge_documents.
//
// Run this AFTER applying supabase/migrations/20260922000000_ceo_knowledge_base.sql
// (that migration creates the table and the storage bucket).
//
// Requires network access to the Supabase project (this repo's Cowork
// sandbox does not have it — run from a machine/session that does, e.g. a
// local `next dev` environment or an interactive Claude Code session in
// this repo).
//
// Usage:
//   node scripts/seed-ceo-knowledge-base.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
// .env.local (same variables the app already uses).

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function loadEnvLocal() {
  const envPath = path.join(repoRoot, '.env.local')
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (checked process.env and .env.local).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const BUCKET = 'ceo-knowledge-base'
const DECKS_DIR = path.join(repoRoot, 'docs', 'country-presentations')

const FILES = [
  { file: 'Austria_Presentation.html', title: 'Study in Austria', country: 'Austria', category: 'Country Deck' },
  { file: 'Belgium_Presentation.html', title: 'Study in Belgium', country: 'Belgium', category: 'Country Deck' },
  { file: 'Denmark_Presentation.html', title: 'Study in Denmark', country: 'Denmark', category: 'Country Deck' },
  { file: 'EuropeanCyprus_Presentation.html', title: 'Study in European Cyprus', country: 'European Cyprus', category: 'Country Deck' },
  { file: 'Germany_Presentation.html', title: 'Study in Germany', country: 'Germany', category: 'Country Deck' },
  { file: 'Hungary_Presentation.html', title: 'Study in Hungary', country: 'Hungary', category: 'Country Deck' },
  { file: 'Italy_Presentation.html', title: 'Study in Italy', country: 'Italy', category: 'Country Deck' },
  { file: 'Latvia_Presentation.html', title: 'Study in Latvia', country: 'Latvia', category: 'Country Deck' },
  { file: 'Lithuania_Presentation.html', title: 'Study in Lithuania', country: 'Lithuania', category: 'Country Deck' },
  { file: 'Malaysia_Presentation.html', title: 'Study in Malaysia', country: 'Malaysia', category: 'Country Deck' },
  { file: 'NewZealand_Presentation.html', title: 'Study in New Zealand', country: 'New Zealand', category: 'Country Deck' },
  { file: 'SouthKorea_Presentation.html', title: 'Study in South Korea', country: 'South Korea', category: 'Country Deck' },
  { file: 'Sweden_Presentation.html', title: 'Study in Sweden', country: 'Sweden', category: 'Country Deck' },
  { file: 'Switzerland_Presentation.html', title: 'Study in Switzerland', country: 'Switzerland', category: 'Country Deck' },
  { file: 'Turkiye_Presentation.html', title: 'Study in Türkiye', country: 'Türkiye', category: 'Country Deck' },
  { file: 'Portugal_D7_Visa_Guidebook.html', title: 'Portugal D7 Visa Guidebook', country: 'Portugal', category: 'Visa Guidebook' },
]

async function main() {
  let ok = 0
  let failed = 0

  for (const entry of FILES) {
    const filePath = path.join(DECKS_DIR, entry.file)
    if (!existsSync(filePath)) {
      console.warn(`SKIP (not found): ${entry.file}`)
      failed++
      continue
    }

    const buffer = readFileSync(filePath)
    const storagePath = `${entry.category === 'Visa Guidebook' ? 'guidebooks' : 'country-decks'}/${entry.file}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: 'text/html', upsert: true })

    if (uploadError) {
      console.error(`UPLOAD FAILED: ${entry.file} —`, uploadError.message)
      failed++
      continue
    }

    const { error: insertError } = await supabase
      .from('ceo_knowledge_documents')
      .upsert(
        {
          title: entry.title,
          category: entry.category,
          country: entry.country,
          storage_path: storagePath,
          file_size: buffer.length,
          mime_type: 'text/html',
        },
        { onConflict: 'storage_path' }
      )

    if (insertError) {
      console.error(`DB INSERT FAILED: ${entry.file} —`, insertError.message)
      failed++
      continue
    }

    console.log(`OK: ${entry.title}`)
    ok++
  }

  console.log(`\nDone. ${ok} uploaded, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

main()
