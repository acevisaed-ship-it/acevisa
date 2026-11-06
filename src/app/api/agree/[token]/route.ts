import { logActivity } from '@/lib/activityLog'
import { publicTokenOutcome } from '@/lib/invoices/consentRules'
import { issueInvoice } from '@/lib/invoices/issueAndSend'
import { firstNameOf, hashConsentToken, hashIp, clientIpFromRequest } from '@/lib/invoices/tokens'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const INVALID = { error: 'This link is invalid or has expired.' }
const RATE_WINDOW_MS = 15 * 60 * 1000
const RATE_MAX = 8

function publicTerms(row: {
  status: string
  expires_at: string
  clients: { name: string } | { name: string }[] | null
  products: { name: string } | { name: string }[] | null
  general_terms: { title: string; version: number; body: string } | { title: string; version: number; body: string }[] | null
  product_terms: { title: string; version: number; body: string } | { title: string; version: number; body: string }[] | null
}) {
  const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] ?? null : v)
  const client = one(row.clients)
  const product = one(row.products)
  const general = one(row.general_terms)
  const policy = one(row.product_terms)
  return {
    firstName: firstNameOf(client?.name ?? ''),
    productName: product?.name ?? 'this service',
    general: general
      ? { title: general.title, version: general.version, body: general.body }
      : null,
    product: policy ? { title: policy.title, version: policy.version, body: policy.body } : null,
  }
}

async function lookupPending(token: string) {
  const supabase = createAdminClient()
  const tokenHash = hashConsentToken(token)
  const { data: consent } = await supabase
    .from('invoice_consents')
    .select(
      'id, status, expires_at, client_id, product_id, general_terms_id, product_terms_id, clients(name), products(name)'
    )
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!consent) return { supabase, data: null }

  const [{ data: general }, { data: productTerms }] = await Promise.all([
    supabase
      .from('terms_documents')
      .select('title, version, body')
      .eq('id', consent.general_terms_id)
      .maybeSingle(),
    supabase
      .from('terms_documents')
      .select('title, version, body')
      .eq('id', consent.product_terms_id)
      .maybeSingle(),
  ])

  return {
    supabase,
    data: {
      ...consent,
      general_terms: general,
      product_terms: productTerms,
    },
  }
}

async function enforceRateLimit(supabase: ReturnType<typeof createAdminClient>, ip: string) {
  const ipHash = hashIp(ip)
  await supabase.from('invoice_consent_rate_limits').insert({ ip_hash: ipHash })
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
  const { count } = await supabase
    .from('invoice_consent_rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('attempted_at', since)
  return (count ?? 0) > RATE_MAX
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 32) {
    return NextResponse.json(INVALID, { status: 400 })
  }

  const { data } = await lookupPending(token)
  const outcome = publicTokenOutcome({
    found: !!data,
    status: (data?.status as 'pending' | 'agreed' | 'expired' | 'revoked') ?? null,
    expiresAt: data?.expires_at ?? null,
  })
  if (outcome !== 'usable' || !data) {
    return NextResponse.json(INVALID, { status: 400 })
  }

  return NextResponse.json({ ok: true, ...publicTerms(data) })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const ip = clientIpFromRequest(request)
  const supabase = createAdminClient()

  if (await enforceRateLimit(supabase, ip)) {
    return NextResponse.json(INVALID, { status: 429 })
  }

  if (!token || token.length < 32) {
    return NextResponse.json(INVALID, { status: 400 })
  }

  let body: { accepted?: boolean; nameTyped?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  if (!body.accepted) {
    return NextResponse.json({ error: 'You must agree to the terms to continue.' }, { status: 400 })
  }

  const { data } = await lookupPending(token)
  const outcome = publicTokenOutcome({
    found: !!data,
    status: (data?.status as 'pending' | 'agreed' | 'expired' | 'revoked') ?? null,
    expiresAt: data?.expires_at ?? null,
  })
  if (outcome !== 'usable' || !data) {
    return NextResponse.json(INVALID, { status: 400 })
  }

  const agreedAt = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase
    .from('invoice_consents')
    .update({
      status: 'agreed',
      agreed_at: agreedAt,
      agreed_ip: ip,
      agreed_user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
      agreed_name_typed: body.nameTyped?.trim()?.slice(0, 200) || null,
      token_hash: hashConsentToken(`${token}:used:${agreedAt}`),
    })
    .eq('id', data.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (updateError || !updated) {
    return NextResponse.json(INVALID, { status: 400 })
  }

  await logActivity({
    clientId: data.client_id,
    actorRole: 'client',
    actionType: 'invoice_consent_agreed',
    description: 'Client agreed to invoice terms',
    metadata: { entity: 'invoice_consent', entityId: data.id },
  })

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('consent_id', data.id)
    .eq('status', 'awaiting_consent')
    .is('deleted_at', null)

  for (const inv of invoices ?? []) {
    const issued = await issueInvoice(supabase, inv.id, {
      consentId: data.id,
      agreedAt,
      actor: { name: 'Client', role: 'client' },
    })
    if (!issued.ok) {
      console.error('[agree POST] issue failed', issued.error)
      return NextResponse.json(
        { error: 'Your agreement was recorded. We could not email the invoice yet — ACE will follow up.' },
        { status: 500 }
      )
    }
  }

  const preview = publicTerms(data)
  return NextResponse.json({
    ok: true,
    firstName: preview.firstName,
    productName: preview.productName,
  })
}
