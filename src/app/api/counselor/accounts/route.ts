import { requireAccountsApi } from '@/lib/admin/requireAccountsApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * The counselor's own Accounts view: their clients, cases and invoices with paid/remaining amounts.
 * Deliberately no profit, expenses, commissions or other counselors' data.
 */
export async function GET() {
  const { admin, error } = await requireAccountsApi('cash')
  if (error) return error
  const supabase = createAdminClient()

  const [{ data: ownClients }, { data: ownDeals }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('counselor_id', admin.id),
    supabase.from('deals').select('id, client_id, service_type, counselor_id').eq('counselor_id', admin.id),
  ])
  const clientMap = new Map<string, string>((ownClients ?? []).map((c) => [c.id, c.name]))
  const extraIds = [...new Set((ownDeals ?? []).map((d) => d.client_id))].filter((id) => !clientMap.has(id))
  if (extraIds.length) {
    const { data: extra } = await supabase.from('clients').select('id, name').in('id', extraIds)
    for (const c of extra ?? []) clientMap.set(c.id, c.name)
  }
  const clientIds = [...clientMap.keys()]
  if (clientIds.length === 0) return NextResponse.json({ clients: [], deals: [], products: [], invoices: [] })

  const [{ data: deals }, { data: invoices }, { data: products }] = await Promise.all([
    supabase.from('deals').select('id, client_id, service_type').in('client_id', clientIds),
    supabase
      .from('invoices')
      .select('id, invoice_number, client_id, total, status, due_date, created_at, currency')
      .in('client_id', clientIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('products').select('id, name').order('name'),
  ])

  const invoiceIds = (invoices ?? []).map((i) => i.id)
  const paid = new Map<string, number>()
  if (invoiceIds.length) {
    const { data: pays } = await supabase.from('payments').select('invoice_id, amount, status').in('invoice_id', invoiceIds)
    for (const p of pays ?? []) {
      if ((p.status ?? 'recorded') === 'reversed') continue
      paid.set(p.invoice_id, (paid.get(p.invoice_id) ?? 0) + Number(p.amount))
    }
  }
  const today = new Date().toISOString().slice(0, 10)

  return NextResponse.json({
    clients: clientIds.map((id) => ({ id, name: clientMap.get(id) })).sort((a, b) => String(a.name).localeCompare(String(b.name))),
    deals: deals ?? [],
    products: products ?? [],
    invoices: (invoices ?? []).map((i) => {
      const received = Math.round((paid.get(i.id) ?? 0) * 100) / 100
      const remaining = Math.max(Math.round((Number(i.total) - received) * 100) / 100, 0)
      return {
        id: i.id, invoice_number: i.invoice_number, client_id: i.client_id, client_name: clientMap.get(i.client_id) ?? '',
        total: Number(i.total), received, remaining, currency: i.currency,
        status: i.status === 'sent' && i.due_date && i.due_date < today ? 'overdue' : i.status,
        due_date: i.due_date, created_at: i.created_at,
      }
    }),
  })
}
