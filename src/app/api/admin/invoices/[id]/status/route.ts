import { INVOICE_STATUSES, type InvoiceStatus } from '@/lib/admin/dealTypes'
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { status } = body

  if (!status || !INVOICE_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { status: status as InvoiceStatus }
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString()
  }

  const supabase = createAdminClient()
  const { data, error: updateError } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select(
      'id, invoice_number, client_id, deal_id, counselor_id, line_items, subtotal, tax_rate, tax_amount, total, currency, status, due_date, paid_at, notes, created_at, clients(name, id), counselors(name)'
    )
    .single()

  if (updateError) {
    console.error('Invoice status update error:', updateError)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }

  return NextResponse.json({ invoice: mapInvoice(data) })
}
