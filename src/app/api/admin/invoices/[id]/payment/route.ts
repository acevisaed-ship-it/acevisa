import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/admin/dealTypes'
import { parseClientJoin, parseCounselorName } from '@/lib/admin/parseCounselorJoin'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function mapInvoice(row: Record<string, unknown>) {
  const client = parseClientJoin(
    row.clients as { name: string; id: string } | { name: string; id: string }[] | null
  )
  return {
    id: row.id as string,
    invoice_number: row.invoice_number as string,
    client_id: row.client_id as string,
    deal_id: row.deal_id as string | null,
    counselor_id: row.counselor_id as string | null,
    line_items: row.line_items as { description: string; amount: number }[],
    subtotal: Number(row.subtotal),
    tax_rate: Number(row.tax_rate),
    tax_amount: Number(row.tax_amount),
    total: Number(row.total),
    currency: row.currency as string,
    status: row.status as string,
    due_date: row.due_date as string | null,
    paid_at: row.paid_at as string | null,
    notes: row.notes as string | null,
    created_at: row.created_at as string,
    client_name: client?.name ?? null,
    counselor_name: parseCounselorName(
      row.counselors as { name: string } | { name: string }[] | null
    ),
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { payment_method, reference_number, paid_at, notes } = body

  if (payment_method && !PAYMENT_METHODS.includes(payment_method)) {
    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, client_id, total, currency, status')
    .eq('id', id)
    .single()

  if (fetchError || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
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
    .update({ status: 'paid', paid_at: paidAt })
    .eq('id', id)
    .select(
      'id, invoice_number, client_id, deal_id, counselor_id, line_items, subtotal, tax_rate, tax_amount, total, currency, status, due_date, paid_at, notes, created_at, clients(name, id), counselors(name)'
    )
    .single()

  if (updateError) {
    console.error('Invoice paid update error:', updateError)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }

  return NextResponse.json({ invoice: mapInvoice(updated) })
}
