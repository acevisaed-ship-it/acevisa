import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/admin/dealTypes'
import { counselorOwnsClient, requireAccountsApi } from '@/lib/admin/requireAccountsApi'
import { sendEmail, paymentReceiptEmailHtml } from '@/lib/email'
import { mapInvoice } from '@/lib/invoices/mapInvoice'
import { termsVersionReference } from '@/lib/invoices/terms'
import { INVOICE_SELECT } from '@/lib/invoices/types'
import type { TermsSnapshot } from '@/lib/invoices/types'
import { writeAudit } from '@/lib/ledger/audit'
import { round2 } from '@/lib/ledger/incentives'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Counselors may record INCOMING payments on their own clients' invoices (never refunds or expenses)
  const { admin, error } = await requireAccountsApi('cash')
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { payment_method, reference_number, paid_at, notes, receipt_url, amount } = body as {
    payment_method?: string
    reference_number?: string
    paid_at?: string
    notes?: string
    receipt_url?: string
    amount?: number | string
  }

  if (payment_method && !PAYMENT_METHODS.includes(payment_method as PaymentMethod)) {
    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select(
      'id, client_id, counselor_id, product_id, deal_id, total, currency, status, invoice_number, line_items, terms_snapshot, receipt_url, deleted_at, clients(name, email, branch_id)'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (fetchError || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const clientJoin = invoice.clients as
    | { name: string; email: string | null; branch_id: string | null }
    | { name: string; email: string | null; branch_id: string | null }[]
    | null
  const clientRow = Array.isArray(clientJoin) ? clientJoin[0] : clientJoin

  if (admin.role === 'counselor' && !(await counselorOwnsClient(admin.id, invoice.client_id))) {
    return NextResponse.json({ error: 'You can only record payments for your own clients' }, { status: 403 })
  }

  if (isBranchScopedAdmin(admin)) {
    if (!clientRow || clientRow.branch_id !== admin.branch_id) {
      return NextResponse.json({ error: 'Invoice not in your branch' }, { status: 403 })
    }
  }

  const { data: existingPayments } = await supabase
    .from('payments')
    .select('amount, status')
    .eq('invoice_id', id)

  const alreadyRecorded = round2(
    (existingPayments ?? [])
      .filter((p) => (p.status ?? 'recorded') !== 'reversed')
      .reduce((s, p) => s + Number(p.amount), 0)
  )
  const remaining = round2(Number(invoice.total) - alreadyRecorded)
  if (remaining <= 0) {
    return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 })
  }

  const requested =
    amount === undefined || amount === null || amount === ''
      ? remaining
      : round2(Number(amount))
  if (!Number.isFinite(requested) || requested <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
  }
  if (requested > remaining + 0.009) {
    return NextResponse.json(
      { error: `Amount exceeds remaining balance of ${remaining}` },
      { status: 400 }
    )
  }

  const paidAt = paid_at ? new Date(paid_at).toISOString() : new Date().toISOString()
  const snapshot = {
    invoice_id: id,
    client_id: invoice.client_id,
    amount: requested,
    currency: invoice.currency,
    payment_method: (payment_method as PaymentMethod) || 'other',
    reference_number: reference_number?.trim() || null,
    paid_at: paidAt,
    recorded_by: admin.id,
    notes: notes?.trim() || null,
    counselor_id: invoice.counselor_id,
    product_id: invoice.product_id,
    deal_id: invoice.deal_id,
    branch_id: clientRow?.branch_id ?? null,
    status: 'recorded',
    receipt_url: receipt_url || null,
  }

  let { error: paymentError } = await supabase.from('payments').insert(snapshot).select('id').single()
  if (paymentError?.code === 'PGRST204') {
    const {
      counselor_id: _c,
      product_id: _p,
      deal_id: _d,
      branch_id: _b,
      status: _s,
      receipt_url: _r,
      ...legacy
    } = snapshot
    ;({ error: paymentError } = await supabase.from('payments').insert(legacy))
  }

  if (paymentError) {
    console.error('Payment insert error:', paymentError)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }

  const fullyPaid = round2(remaining - requested) <= 0.009
  const invoicePatch: Record<string, unknown> = {}
  if (fullyPaid) {
    invoicePatch.status = 'paid'
    invoicePatch.paid_at = paidAt
  }
  if (receipt_url) invoicePatch.receipt_url = receipt_url

  if (Object.keys(invoicePatch).length > 0) {
    const { error: updateError } = await supabase
      .from('invoices')
      .update(invoicePatch)
      .eq('id', id)
      .is('deleted_at', null)
    if (updateError) {
      console.error('Invoice paid update error:', updateError)
      return NextResponse.json({ error: 'Payment recorded but invoice update failed' }, { status: 500 })
    }
  }

  const { data: updated, error: reloadError } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('id', id)
    .single()
  if (reloadError || !updated) {
    return NextResponse.json({ error: 'Payment recorded but invoice reload failed' }, { status: 500 })
  }

  await writeAudit({
    actorId: admin.id,
    actorRole: admin.role,
    branchId: admin.branch_id ?? clientRow?.branch_id ?? null,
    entityType: 'payment',
    entityId: id,
    action: 'recorded',
    after: { invoice_id: id, amount: requested, fullyPaid },
  })

  if (clientRow?.email) {
    const lineItems = (invoice.line_items as { description: string; amount: number }[]) ?? []
    await sendEmail({
      to: clientRow.email,
      subject: `Payment received — invoice ${invoice.invoice_number}`,
      html: paymentReceiptEmailHtml({
        clientName: clientRow.name,
        invoiceNumber: invoice.invoice_number,
        amount: requested.toLocaleString(),
        currency: invoice.currency,
        paidAtPKT: new Date(paidAt).toLocaleString('en-PK', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        lineItems,
        termsReference: termsVersionReference((invoice.terms_snapshot as TermsSnapshot | null) ?? null),
      }),
    })
  }

  return NextResponse.json({
    invoice: mapInvoice(updated as Record<string, unknown>),
    amount: requested,
    remaining: round2(remaining - requested),
    fullyPaid,
  })
}
