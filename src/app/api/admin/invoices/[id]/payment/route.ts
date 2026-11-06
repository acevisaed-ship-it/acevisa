import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/admin/dealTypes'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { sendEmail, paymentReceiptEmailHtml } from '@/lib/email'
import { mapInvoice } from '@/lib/invoices/mapInvoice'
import { termsVersionReference } from '@/lib/invoices/terms'
import { INVOICE_SELECT } from '@/lib/invoices/types'
import type { TermsSnapshot } from '@/lib/invoices/types'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { payment_method, reference_number, paid_at, notes, receipt_url } = body

  if (payment_method && !PAYMENT_METHODS.includes(payment_method)) {
    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, client_id, total, currency, status, invoice_number, line_items, terms_snapshot, deleted_at, clients(name, email)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (fetchError || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  if (isBranchScopedAdmin(admin)) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('branch_id')
      .eq('id', invoice.client_id)
      .single()
    if (!clientRow || clientRow.branch_id !== admin.branch_id) {
      return NextResponse.json({ error: 'Invoice not in your branch' }, { status: 403 })
    }
  }

  if (invoice.status === 'paid') {
    return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 })
  }

  const paidAt = paid_at ? new Date(paid_at).toISOString() : new Date().toISOString()

  const { error: paymentError } = await supabase.from('payments').insert({
    invoice_id: id,
    client_id: invoice.client_id,
    amount: invoice.total,
    currency: invoice.currency,
    payment_method: (payment_method as PaymentMethod) || 'other',
    reference_number: reference_number?.trim() || null,
    paid_at: paidAt,
    recorded_by: admin.id,
    notes: notes?.trim() || null,
  })

  if (paymentError) {
    console.error('Payment insert error:', paymentError)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: paidAt, receipt_url: receipt_url || null })
    .eq('id', id)
    .is('deleted_at', null)
    .select(INVOICE_SELECT)
    .single()

  if (updateError) {
    console.error('Invoice paid update error:', updateError)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }

  const clientJoin = invoice.clients as
    | { name: string; email: string | null }
    | { name: string; email: string | null }[]
    | null
  const clientRow = Array.isArray(clientJoin) ? clientJoin[0] : clientJoin
  if (clientRow?.email) {
    const lineItems = (invoice.line_items as { description: string; amount: number }[]) ?? []
    await sendEmail({
      to: clientRow.email,
      subject: `Payment received — invoice ${invoice.invoice_number}`,
      html: paymentReceiptEmailHtml({
        clientName: clientRow.name,
        invoiceNumber: invoice.invoice_number,
        amount: Number(invoice.total).toLocaleString(),
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

  return NextResponse.json({ invoice: mapInvoice(updated as Record<string, unknown>) })
}
