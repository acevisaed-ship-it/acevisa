import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { INVOICE_STATUSES, type InvoiceStatus } from '@/lib/admin/dealTypes'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { mapInvoice } from '@/lib/invoices/mapInvoice'
import { INVOICE_SELECT } from '@/lib/invoices/types'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { status } = body

  if (!status || !INVOICE_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (status === 'sent' || status === 'awaiting_consent') {
    return NextResponse.json(
      { error: 'Use Send to Client to issue an invoice' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  if (isBranchScopedAdmin(admin)) {
    const { data: row } = await supabase
      .from('invoices')
      .select('id, clients!inner(branch_id)')
      .eq('id', id)
      .is('deleted_at', null)
      .eq('clients.branch_id', admin.branch_id)
      .maybeSingle()
    if (!row) {
      return NextResponse.json({ error: 'Invoice not in your branch' }, { status: 403 })
    }
  }

  const updates: Record<string, unknown> = { status: status as InvoiceStatus }
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString()
  }

  const { data, error: updateError } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select(INVOICE_SELECT)
    .single()

  if (updateError) {
    console.error('Invoice status update error:', updateError)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }

  return NextResponse.json({ invoice: mapInvoice(data as Record<string, unknown>) })
}
