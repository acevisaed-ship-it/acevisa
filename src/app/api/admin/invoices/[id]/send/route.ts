import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { counselorOwnsClient, requireAccountsApi } from '@/lib/admin/requireAccountsApi'
import { sendInvoiceToClient } from '@/lib/invoices/issueAndSend'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, error } = await requireAccountsApi('cash')
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  if (admin.role === 'counselor') {
    const { data: inv } = await supabase.from('invoices').select('client_id').eq('id', id).is('deleted_at', null).maybeSingle()
    if (!inv || !(await counselorOwnsClient(admin.id, inv.client_id))) {
      return NextResponse.json({ error: 'You can only send invoices for your own clients' }, { status: 403 })
    }
  }

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

  const result = await sendInvoiceToClient(supabase, id, {
    id: admin.id,
    name: admin.name,
    role: admin.role,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ invoice: result.invoice, message: result.message })
}
