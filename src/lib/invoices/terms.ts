import type { createAdminClient } from '@/lib/supabase/server'
import { findUnfilledTermPlaceholders } from '@/lib/invoices/termPlaceholders'
import { escapeHtml } from '@/lib/invoices/tokens'
import type { TermsSnapshot, TermsSnapshotDoc } from '@/lib/invoices/types'

type AdminDb = ReturnType<typeof createAdminClient>

export async function getActiveTerms(
  supabase: AdminDb,
  productId: string
): Promise<
  | { ok: true; general: TermsSnapshotDoc; product: TermsSnapshotDoc }
  | { ok: false; error: string }
> {
  const [{ data: general, error: generalError }, { data: product, error: productError }] =
    await Promise.all([
      supabase
        .from('terms_documents')
        .select('id, title, version, body, scope')
        .eq('scope', 'general')
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('terms_documents')
        .select('id, title, version, body, scope')
        .eq('scope', 'product')
        .eq('product_id', productId)
        .eq('is_active', true)
        .maybeSingle(),
    ])

  if (generalError || productError) {
    return { ok: false, error: 'Failed to load published terms' }
  }
  if (!general) {
    return {
      ok: false,
      error:
        'No published terms of service. A CEO must publish general terms before invoices can be sent.',
    }
  }
  if (!product) {
    return {
      ok: false,
      error:
        'This product has no published policy. Publish a product policy in Terms before sending invoices.',
    }
  }

  return {
    ok: true,
    general: general as TermsSnapshotDoc,
    product: product as TermsSnapshotDoc,
  }
}

export async function checkTermsReadyForInvoice(
  supabase: AdminDb,
  productId: string | null | undefined
): Promise<
  | { ok: true; general: TermsSnapshotDoc; product: TermsSnapshotDoc }
  | { ok: false; error: string; placeholders: string[]; status: number }
> {
  if (!productId) {
    return {
      ok: false,
      error: 'Select a product with a published policy before sending this invoice.',
      placeholders: [],
      status: 400,
    }
  }

  const terms = await getActiveTerms(supabase, productId)
  if (!terms.ok) {
    return { ok: false, error: terms.error, placeholders: [], status: 400 }
  }

  const placeholders = [
    ...findUnfilledTermPlaceholders(terms.general.body),
    ...findUnfilledTermPlaceholders(terms.product.body),
  ]
  const unique: string[] = []
  for (const item of placeholders) {
    if (!unique.includes(item)) unique.push(item)
  }

  if (unique.length > 0) {
    return {
      ok: false,
      error:
        'These terms still have blanks to fill before an invoice can be sent. Open Admin → Terms and replace the highlighted [brackets], then a CEO must publish. Remaining blanks: ' +
        unique.join('; '),
      placeholders: unique,
      status: 400,
    }
  }

  return { ok: true, general: terms.general, product: terms.product }
}

export async function findValidAgreedConsent(
  supabase: AdminDb,
  clientId: string,
  productId: string,
  generalTermsId: string,
  productTermsId: string
) {
  const { data, error } = await supabase
    .from('invoice_consents')
    .select('id, status, general_terms_id, product_terms_id, agreed_at')
    .eq('client_id', clientId)
    .eq('product_id', productId)
    .eq('status', 'agreed')
    .eq('general_terms_id', generalTermsId)
    .eq('product_terms_id', productTermsId)
    .order('agreed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[findValidAgreedConsent]', error.message)
    return null
  }
  return data
}

export function buildTermsSnapshot(args: {
  general: TermsSnapshotDoc
  product: TermsSnapshotDoc
  agreedAt: string | null
}): TermsSnapshot {
  return {
    agreedAt: args.agreedAt,
    general: args.general,
    product: args.product,
  }
}

export function termsDisclaimerHtml(snapshot: TermsSnapshot): string {
  const agreed = snapshot.agreedAt
    ? `Agreed on ${new Date(snapshot.agreedAt).toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`
    : 'Agreement recorded with this invoice'

  const block = (doc: TermsSnapshotDoc) => `
    <div style="margin:16px 0;padding:16px;background:#F4F5F4;border-radius:12px;border:1px solid #E6E8E7">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0A3F3A">${escapeHtml(doc.title)} · v${doc.version}</p>
      <pre style="margin:0;white-space:pre-wrap;font-family:inherit;font-size:12px;line-height:1.55;color:#0A3F3A">${escapeHtml(doc.body)}</pre>
    </div>`

  return `
    <div style="margin-top:28px;padding-top:16px;border-top:1px solid #E6E8E7">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0A3F3A">Disclaimer — policy and terms of service</p>
      <p style="margin:0 0 12px;font-size:12px;color:#0A3F3A99">${escapeHtml(agreed)}. The text below is the version in force when this invoice was issued and does not change if terms are updated later.</p>
      ${block(snapshot.product)}
      ${block(snapshot.general)}
      <p style="margin:12px 0 0;font-size:11px;color:#0A3F3A99">This record is evidence of agreement. It is not legal advice. Have a lawyer review the wording before relying on it.</p>
    </div>`
}

export function termsDisclaimerPlain(snapshot: TermsSnapshot): string {
  const agreed = snapshot.agreedAt
    ? `Agreed on ${new Date(snapshot.agreedAt).toLocaleDateString('en-PK')}`
    : 'Agreement recorded with this invoice'
  return [
    'DISCLAIMER — POLICY AND TERMS OF SERVICE',
    agreed,
    '',
    `${snapshot.product.title} (v${snapshot.product.version})`,
    snapshot.product.body,
    '',
    `${snapshot.general.title} (v${snapshot.general.version})`,
    snapshot.general.body,
  ].join('\n')
}

export function termsVersionReference(snapshot: TermsSnapshot | null): string {
  if (!snapshot) return ''
  const agreed = snapshot.agreedAt
    ? new Date(snapshot.agreedAt).toLocaleDateString('en-PK')
    : 'the issue date'
  return `This payment relates to terms of service v${snapshot.general.version} and ${snapshot.product.title} policy v${snapshot.product.version}, agreed on ${agreed}.`
}
