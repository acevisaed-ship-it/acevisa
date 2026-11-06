import { logActivity } from '@/lib/activityLog'
import { changedFields, formatFieldChanges } from '@/lib/admin/accountEntries'
import { INVOICE_STATUSES, type InvoiceStatus } from '@/lib/admin/dealTypes'
import { requireAdminApi, requireCeoApi } from '@/lib/admin/requireAdminApi'
import { mapInvoice } from '@/lib/invoices/mapInvoice'
import { INVOICE_SELECT } from '@/lib/invoices/types'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type LineItem = { description: string; amount: number }

function snapshot(row: {
  client_id: string
  deal_id: string | null
  counselor_id: string | null
  product_id: string | null
  line_items: LineItem[]
  subtotal: number
  total: number
  status: string
  due_date: string | null
  notes: string | null
}) {
  return {
    client_id: row.client_id,
    deal_id: row.deal_id,
    counselor_id: row.counselor_id,
    product_id: row.product_id,
    line_items: row.line_items,
    subtotal: row.subtotal,
    total: row.total,
    status: row.status,
    due_date: row.due_date,
    notes: row.notes,
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()
  const { data, error: fetchError } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (fetchError || !data) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }
  return NextResponse.json({ invoice: mapInvoice(data as Record<string, unknown>) })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, error } = await requireCeoApi()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { client_id, deal_id, line_items, due_date, notes, status, product_id } = body

  if (!client_id) {
    return NextResponse.json({ error: 'Client is required' }, { status: 400 })
  }

  const items: LineItem[] = Array.isArray(line_items) ? line_items : []
  const validItems = items.filter((i) => i.description?.trim() && Number(i.amount) > 0)
  if (validItems.length === 0) {
    return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })
  }

  const invoiceStatus: InvoiceStatus | null =
    status && INVOICE_STATUSES.includes(status as InvoiceStatus) ? (status as InvoiceStatus) : null
  if (status && !invoiceStatus) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (invoiceStatus === 'sent' || invoiceStatus === 'awaiting_consent') {
    return NextResponse.json(
      { error: 'Use Send to Client to issue an invoice. Status cannot be set to sent or awaiting agreement here.' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const { data: existing, error: fetchError } = await supabase
    .from('invoices')
    .select(
      'id, invoice_number, client_id, deal_id, counselor_id, product_id, line_items, subtotal, total, status, due_date, notes, paid_at, deleted_at'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const { data: clientRow } = await supabase
    .from('clients')
    .select('counselor_id')
    .eq('id', client_id)
    .maybeSingle()

  const subtotal = validItems.reduce((sum, i) => sum + Number(i.amount), 0)
  const nextStatus = invoiceStatus ?? (existing.status as InvoiceStatus)
  const updates: Record<string, unknown> = {
    client_id,
    deal_id: deal_id || null,
    counselor_id: clientRow?.counselor_id || null,
    product_id: product_id || null,
    line_items: validItems,
    subtotal,
    tax_amount: 0,
    total: subtotal,
    status: nextStatus,
    due_date: due_date || null,
    notes: notes?.trim() || null,
  }

  if (nextStatus === 'paid' && !existing.paid_at) {
    updates.paid_at = new Date().toISOString()
  }

  const { data, error: updateError } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select(INVOICE_SELECT)
    .single()

  if (updateError || !data) {
    console.error('[invoices PATCH] update failed:', updateError)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }

  const mapped = mapInvoice(data as Record<string, unknown>)
  const before = snapshot({
    ...existing,
    line_items: existing.line_items as LineItem[],
    subtotal: Number(existing.subtotal),
    total: Number(existing.total),
  })
  const after = snapshot(mapped)
  const changes = changedFields(before, after)

  if (Object.keys(changes).length > 0) {
    const changeText = formatFieldChanges(changes)
    await logActivity({
      clientId: mapped.client_id,
      counselorId: admin.id,
      actorRole: admin.role,
      actionType: 'invoice_updated',
      description: `${admin.name} edited invoice ${existing.invoice_number}: ${changeText}`,
      metadata: {
        entity: 'invoice',
        entityId: id,
        invoiceNumber: existing.invoice_number,
        before,
        after,
        changes,
      },
    })
  }

  return NextResponse.json({ invoice: mapped })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, error } = await requireCeoApi()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data: existing, error: fetchError } = await supabase
    .from('invoices')
    .select(
      'id, invoice_number, client_id, deal_id, counselor_id, product_id, line_items, subtotal, total, status, due_date, notes, deleted_at'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({ deleted_at: new Date().toISOString(), deleted_by: admin.id })
    .eq('id', id)
    .is('deleted_at', null)

  if (updateError) {
    console.error('[invoices DELETE] soft-delete failed:', updateError)
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }

  const before = snapshot({
    ...existing,
    line_items: existing.line_items as LineItem[],
    subtotal: Number(existing.subtotal),
    total: Number(existing.total),
  })

  await logActivity({
    clientId: existing.client_id,
    counselorId: admin.id,
    actorRole: admin.role,
    actionType: 'invoice_deleted',
    description: `${admin.name} deleted invoice ${existing.invoice_number} (PKR ${Number(existing.total).toLocaleString('en-PK')}, status ${existing.status})`,
    metadata: {
      entity: 'invoice',
      entityId: id,
      invoiceNumber: existing.invoice_number,
      before,
      after: null,
    },
  })

  return NextResponse.json({ ok: true })
}
