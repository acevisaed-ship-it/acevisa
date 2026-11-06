import { logActivity } from '@/lib/activityLog'
import {
  invoiceCopyCounselorEmailHtml,
  invoiceIssuedEmailHtml,
  sendEmail,
  termsAcceptanceEmailHtml,
  termsReminderEmailHtml,
  termsRequestCounselorEmailHtml,
} from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { consentSatisfiesCurrent } from '@/lib/invoices/consentRules'
import { mapInvoice } from '@/lib/invoices/mapInvoice'
import { paymentInstructionsHtml } from '@/lib/invoices/paymentInstructions'
import {
  buildTermsSnapshot,
  findValidAgreedConsent,
  getActiveTerms,
  termsDisclaimerHtml,
} from '@/lib/invoices/terms'
import { INVOICE_SELECT } from '@/lib/invoices/types'
import {
  appBaseUrl,
  consentExpiresAt,
  escapeHtml,
  firstNameOf,
  generateConsentToken,
  hashConsentToken,
} from '@/lib/invoices/tokens'
import { createAdminClient } from '@/lib/supabase/server'

type AdminDb = ReturnType<typeof createAdminClient>

type StaffActor = { id: string; name: string; role: string }

function lineItemsHtml(items: { description: string; amount: number }[], currency: string) {
  return items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${escapeHtml(i.description)}</td><td style="padding:6px 0;text-align:right">${currency} ${Number(i.amount).toLocaleString('en-PK')}</td></tr>`
    )
    .join('')
}

async function loadInvoiceBundle(supabase: AdminDb, invoiceId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select(
      'id, invoice_number, client_id, counselor_id, product_id, consent_id, terms_snapshot, issued_at, line_items, subtotal, total, currency, status, due_date, notes, created_at, deleted_at, clients(id, name, email), counselors!counselor_id(id, name, email), products(id, name)'
    )
    .eq('id', invoiceId)
    .is('deleted_at', null)
    .maybeSingle()

  return { invoice: data, error }
}

function joinOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export async function sendInvoiceToClient(
  supabase: AdminDb,
  invoiceId: string,
  actor: StaffActor,
  options?: { resendConsent?: boolean }
): Promise<{ ok: true; invoice: ReturnType<typeof mapInvoice>; message: string } | { ok: false; error: string; status: number }> {
  const { invoice, error } = await loadInvoiceBundle(supabase, invoiceId)
  if (error || !invoice) {
    return { ok: false, error: 'Invoice not found', status: 404 }
  }
  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    return { ok: false, error: `Cannot send an invoice that is ${invoice.status}`, status: 400 }
  }
  if (invoice.status === 'sent' && !options?.resendConsent) {
    return { ok: false, error: 'Invoice has already been issued', status: 400 }
  }

  const client = joinOne(
    invoice.clients as { id: string; name: string; email: string | null } | { id: string; name: string; email: string | null }[] | null
  )
  if (!client) {
    return { ok: false, error: 'Invoice is missing a client', status: 400 }
  }
  if (!client.email?.trim()) {
    return {
      ok: false,
      error: 'This client has no email address. Add an email on the client profile before sending.',
      status: 400,
    }
  }
  if (!invoice.product_id) {
    return {
      ok: false,
      error: 'Select a product with a published policy before sending this invoice.',
      status: 400,
    }
  }

  const terms = await getActiveTerms(supabase, invoice.product_id)
  if (!terms.ok) return { ok: false, error: terms.error, status: 400 }

  const counselor = joinOne(
    invoice.counselors as { id: string; name: string; email: string } | { id: string; name: string; email: string }[] | null
  )
  const product = joinOne(invoice.products as { id: string; name: string } | { id: string; name: string }[] | null)
  const productName = product?.name ?? 'this service'
  const firstName = firstNameOf(client.name)

  const existing = await findValidAgreedConsent(
    supabase,
    client.id,
    invoice.product_id,
    terms.general.id,
    terms.product.id
  )

  if (existing && consentSatisfiesCurrent({
    status: 'agreed',
    generalTermsId: existing.general_terms_id,
    productTermsId: existing.product_terms_id,
    active: { generalId: terms.general.id, productId: terms.product.id },
  })) {
    const issued = await issueInvoice(supabase, invoiceId, {
      consentId: existing.id,
      agreedAt: existing.agreed_at,
      actor,
    })
    if (!issued.ok) return issued
    return { ok: true, invoice: issued.invoice, message: 'Invoice issued — client had already agreed to the current terms.' }
  }

  const rawToken = generateConsentToken()
  const tokenHash = hashConsentToken(rawToken)
  const expiresAt = consentExpiresAt()
  let consentId = options?.resendConsent ? invoice.consent_id : null

  if (options?.resendConsent && consentId) {
    const { error: invalidateError } = await supabase
      .from('invoice_consents')
      .update({
        status: 'pending',
        token_hash: tokenHash,
        requested_by: actor.id,
        requested_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        reminder_sent_at: null,
      })
      .eq('id', consentId)
      .in('status', ['pending', 'expired', 'revoked'])

    if (invalidateError) {
      console.error('[sendInvoice] resend update failed', invalidateError.message)
      return { ok: false, error: 'Failed to refresh the terms request', status: 500 }
    }
  } else {
    const { data: consent, error: consentError } = await supabase
      .from('invoice_consents')
      .insert({
        client_id: client.id,
        product_id: invoice.product_id,
        general_terms_id: terms.general.id,
        product_terms_id: terms.product.id,
        token_hash: tokenHash,
        status: 'pending',
        requested_by: actor.id,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single()

    if (consentError || !consent) {
      console.error('[sendInvoice] consent insert failed', consentError?.message)
      return { ok: false, error: 'Failed to create terms request', status: 500 }
    }
    consentId = consent.id
  }

  const agreeUrl = `${appBaseUrl()}/agree/${rawToken}`
  const expiresLabel = expiresAt.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const policyHtml = `<div style="margin:12px 0;padding:12px;background:#F4F5F4;border-radius:12px"><p style="margin:0 0 8px;font-weight:700">${escapeHtml(terms.product.title)} · v${terms.product.version}</p><pre style="margin:0;white-space:pre-wrap;font-family:inherit;font-size:12px">${escapeHtml(terms.product.body)}</pre></div>`
  const generalHtml = `<div style="margin:12px 0;padding:12px;background:#F4F5F4;border-radius:12px"><p style="margin:0 0 8px;font-weight:700">${escapeHtml(terms.general.title)} · v${terms.general.version}</p><pre style="margin:0;white-space:pre-wrap;font-family:inherit;font-size:12px">${escapeHtml(terms.general.body)}</pre></div>`

  const clientSent = await sendEmail({
    to: client.email,
    subject: `Please agree to our terms — ${productName}`,
    html: termsAcceptanceEmailHtml({
      firstName: escapeHtml(firstName),
      productName: escapeHtml(productName),
      policyHtml,
      generalHtml,
      agreeUrl,
      expiresLabel,
    }),
  })
  if (!clientSent) {
    if (!options?.resendConsent && consentId) {
      await supabase.from('invoice_consents').update({ status: 'revoked' }).eq('id', consentId)
    }
    return {
      ok: false,
      error: 'Could not email the terms request to the client. The invoice was not issued. Check email settings and try again.',
      status: 502,
    }
  }

  if (counselor?.email) {
    const counselorSent = await sendEmail({
      to: counselor.email,
      subject: `Terms request sent to ${firstName}`,
      html: termsRequestCounselorEmailHtml({
        counselorName: escapeHtml(counselor.name),
        clientFirstName: escapeHtml(firstName),
        productName: escapeHtml(productName),
      }),
    })
    if (!counselorSent) {
      console.error('[sendInvoice] counselor terms-request email failed')
    }
  }

  const { error: invoiceUpdateError } = await supabase
    .from('invoices')
    .update({ status: 'awaiting_consent', consent_id: consentId })
    .eq('id', invoiceId)
    .is('deleted_at', null)

  if (invoiceUpdateError) {
    console.error('[sendInvoice] invoice awaiting_consent failed', invoiceUpdateError.message)
    return { ok: false, error: 'Failed to mark invoice as awaiting agreement', status: 500 }
  }

  if (counselor?.id) {
    await createNotification({
      counselorId: counselor.id,
      type: 'invoice',
      title: `Terms request sent to ${firstName}`,
      body: `Please wait for ${client.name} to agree before invoice ${invoice.invoice_number} is issued.`,
      clientId: client.id,
    })
  }

  await logActivity({
    clientId: client.id,
    counselorId: actor.id,
    actorRole: actor.role,
    actionType: options?.resendConsent ? 'invoice_consent_resent' : 'invoice_consent_requested',
    description: `${actor.name} ${options?.resendConsent ? 'resent' : 'sent'} a terms request for invoice ${invoice.invoice_number}`,
    metadata: { entity: 'invoice', entityId: invoiceId, invoiceNumber: invoice.invoice_number },
  })

  const { data: refreshed } = await supabase.from('invoices').select(INVOICE_SELECT).eq('id', invoiceId).single()
  return {
    ok: true,
    invoice: mapInvoice(refreshed as Record<string, unknown>),
    message: 'Terms-acceptance email sent to the client. The invoice will follow after they agree.',
  }
}

export async function issueInvoice(
  supabase: AdminDb,
  invoiceId: string,
  opts: { consentId: string; agreedAt: string | null; actor: StaffActor | { id?: string; name: string; role: string } }
): Promise<{ ok: true; invoice: ReturnType<typeof mapInvoice> } | { ok: false; error: string; status: number }> {
  const { invoice, error } = await loadInvoiceBundle(supabase, invoiceId)
  if (error || !invoice) return { ok: false, error: 'Invoice not found', status: 404 }
  if (invoice.status === 'sent' || invoice.status === 'paid') {
    const { data: refreshed } = await supabase.from('invoices').select(INVOICE_SELECT).eq('id', invoiceId).single()
    return { ok: true, invoice: mapInvoice(refreshed as Record<string, unknown>) }
  }
  if (!invoice.product_id) {
    return { ok: false, error: 'Invoice has no product; cannot attach a policy snapshot.', status: 400 }
  }

  const terms = await getActiveTerms(supabase, invoice.product_id)
  if (!terms.ok) return { ok: false, error: terms.error, status: 400 }

  const client = joinOne(
    invoice.clients as { id: string; name: string; email: string | null } | { id: string; name: string; email: string | null }[] | null
  )
  const counselor = joinOne(
    invoice.counselors as { id: string; name: string; email: string } | { id: string; name: string; email: string }[] | null
  )
  if (!client?.email) {
    return { ok: false, error: 'This client has no email address. Add an email before issuing.', status: 400 }
  }

  const snapshot = buildTermsSnapshot({
    general: terms.general,
    product: terms.product,
    agreedAt: opts.agreedAt,
  })
  const previousStatus = invoice.status
  const issuedAt = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      status: 'sent',
      issued_at: issuedAt,
      consent_id: opts.consentId,
      terms_snapshot: snapshot,
    })
    .eq('id', invoiceId)
    .is('deleted_at', null)

  if (updateError) {
    console.error('[issueInvoice] update failed', updateError.message)
    return { ok: false, error: 'Failed to issue invoice', status: 500 }
  }

  const items = (invoice.line_items as { description: string; amount: number }[]) ?? []
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'on receipt'
  const agreedOn = opts.agreedAt
    ? new Date(opts.agreedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date(issuedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
  const disclaimerHtml = termsDisclaimerHtml(snapshot)

  const clientSent = await sendEmail({
    to: client.email,
    subject: `Invoice ${invoice.invoice_number} from ACE Altius Consulting`,
    html: invoiceIssuedEmailHtml({
      clientName: escapeHtml(client.name),
      invoiceNumber: escapeHtml(invoice.invoice_number),
      dueDate,
      currency: invoice.currency,
      total: Number(invoice.total).toLocaleString('en-PK'),
      lineItemsHtml: lineItemsHtml(items, invoice.currency),
      paymentInstructionsHtml: paymentInstructionsHtml(),
      disclaimerHtml,
    }),
  })

  if (!clientSent) {
    await supabase
      .from('invoices')
      .update({ status: previousStatus, issued_at: null, terms_snapshot: invoice.terms_snapshot })
      .eq('id', invoiceId)
    return {
      ok: false,
      error: 'Could not email the invoice to the client. Status was left unchanged.',
      status: 502,
    }
  }

  if (counselor?.email) {
    const counselorSent = await sendEmail({
      to: counselor.email,
      subject: `Invoice copy ${invoice.invoice_number} — client agreed ${agreedOn}`,
      html: invoiceCopyCounselorEmailHtml({
        counselorName: escapeHtml(counselor.name),
        clientName: escapeHtml(client.name),
        invoiceNumber: escapeHtml(invoice.invoice_number),
        agreedOn,
        currency: invoice.currency,
        total: Number(invoice.total).toLocaleString('en-PK'),
        disclaimerHtml,
      }),
    })
    if (!counselorSent) {
      await supabase
        .from('invoices')
        .update({ status: previousStatus, issued_at: null, terms_snapshot: invoice.terms_snapshot })
        .eq('id', invoiceId)
      return {
        ok: false,
        error: 'Client invoice email failed to complete (counselor copy). Status was left unchanged.',
        status: 502,
      }
    }
  }

  if (counselor?.id) {
    await createNotification({
      counselorId: counselor.id,
      type: 'invoice',
      title: `Invoice ${invoice.invoice_number} issued`,
      body: `${client.name} agreed on ${agreedOn}. A copy of the invoice was emailed to you.`,
      clientId: client.id,
    })
  }

  await logActivity({
    clientId: client.id,
    counselorId: opts.actor.id,
    actorRole: opts.actor.role,
    actionType: 'invoice_issued',
    description: `Invoice ${invoice.invoice_number} issued after terms agreement`,
    metadata: {
      entity: 'invoice',
      entityId: invoiceId,
      invoiceNumber: invoice.invoice_number,
      consentId: opts.consentId,
      generalVersion: snapshot.general.version,
      productVersion: snapshot.product.version,
    },
  })

  const { data: refreshed } = await supabase.from('invoices').select(INVOICE_SELECT).eq('id', invoiceId).single()
  return { ok: true, invoice: mapInvoice(refreshed as Record<string, unknown>) }
}

export async function sendConsentReminder(supabase: AdminDb, consentId: string) {
  const { data: consent } = await supabase
    .from('invoice_consents')
    .select('id, client_id, product_id, expires_at, clients(name, email), products(name)')
    .eq('id', consentId)
    .maybeSingle()
  if (!consent) return false

  const client = joinOne(consent.clients as { name: string; email: string | null } | { name: string; email: string | null }[] | null)
  const product = joinOne(consent.products as { name: string } | { name: string }[] | null)
  if (!client?.email) return false

  const rawToken = generateConsentToken()
  const { error: rotateError } = await supabase
    .from('invoice_consents')
    .update({ token_hash: hashConsentToken(rawToken) })
    .eq('id', consentId)
    .eq('status', 'pending')
  if (rotateError) {
    console.error('[sendConsentReminder] token rotate failed', rotateError.message)
    return false
  }

  const expiresLabel = new Date(consent.expires_at).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const sent = await sendEmail({
    to: client.email,
    subject: 'Reminder: please agree to our terms',
    html: termsReminderEmailHtml({
      firstName: escapeHtml(firstNameOf(client.name)),
      productName: escapeHtml(product?.name ?? 'your service'),
      agreeUrl: `${appBaseUrl()}/agree/${rawToken}`,
      expiresLabel,
    }),
  })
  if (sent) {
    await supabase
      .from('invoice_consents')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', consentId)
  }
  return sent
}
