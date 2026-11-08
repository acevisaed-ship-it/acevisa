import { logActivity } from '@/lib/activityLog'
import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAccountsApi } from '@/lib/admin/requireAccountsApi'
import { mapInvoice } from '@/lib/invoices/mapInvoice'
import { INVOICE_SELECT } from '@/lib/invoices/types'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, error } = await requireAccountsApi('full')
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, client_id, consent_id, status, deleted_at, clients(branch_id)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  if (isBranchScopedAdmin(admin)) {
    const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients
    if (!client || client.branch_id !== admin.branch_id) {
      return NextResponse.json({ error: 'Invoice not in your branch' }, { status: 403 })
    }
  }

  if (!invoice.consent_id) {
    return NextResponse.json({ error: 'No terms request to revoke' }, { status: 400 })
  }
  if (invoice.status === 'sent' || invoice.status === 'paid') {
    return NextResponse.json({ error: 'Cannot revoke terms after the invoice has been issued' }, { status: 400 })
  }

  const { error: consentError } = await supabase
    .from('invoice_consents')
    .update({ status: 'revoked' })
    .eq('id', invoice.consent_id)
    .in('status', ['pending', 'expired'])

  if (consentError) {
    return NextResponse.json({ error: 'Failed to revoke terms request' }, { status: 500 })
  }

  await supabase
    .from('invoices')
    .update({ status: 'draft' })
    .eq('id', id)
    .is('deleted_at', null)

  await logActivity({
    clientId: invoice.client_id,
    counselorId: admin.id,
    actorRole: admin.role,
    actionType: 'invoice_consent_revoked',
    description: `${admin.name} revoked the terms request for invoice ${invoice.invoice_number}`,
    metadata: { entity: 'invoice', entityId: id, invoiceNumber: invoice.invoice_number },
  })

  const { data: refreshed } = await supabase.from('invoices').select(INVOICE_SELECT).eq('id', id).single()
  return NextResponse.json({ invoice: mapInvoice(refreshed as Record<string, unknown>) })
}
