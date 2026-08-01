import { INVOICE_STATUSES, type InvoiceStatus } from '@/lib/admin/dealTypes'
import { parseClientJoin, parseCounselorName } from '@/lib/admin/parseCounselorJoin'
import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type LineItem = { description: string; amount: number }

function mapInvoice(row: Record<string, unknown>) {
  const client = parseClientJoin(
    row.clients as { name: string; id: string } | { name: string; id: string }[] | null
  )
  const product = row.products as { name: string } | null
  return {
    id: row.id as string,
    invoice_number: row.invoice_number as string,
    client_id: row.client_id as string,
    deal_id: row.deal_id as string | null,
    counselor_id: row.counselor_id as string | null,
    product_id: row.product_id as string | null,
    product_name: product?.name ?? null,
    line_items: row.line_items as LineItem[],
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

async function generateInvoiceNumber(supabase: ReturnType<typeof createAdminClient>) {
  const year = new Date().getFullYear()
  const prefix = `ACE-${year}-`
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)

  if (!data?.length) return `${prefix}001`

  const last = data[0].invoice_number
  const seq = parseInt(last.replace(prefix, ''), 10)
  return `${prefix}${String((seq || 0) + 1).padStart(3, '0')}`
}

export async function GET(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const status = new URL(request.url).searchParams.get('status')

  const branchScoped = isBranchScopedAdmin(admin)
  const supabase = createAdminClient()
  let query = supabase
    .from('invoices')
    .select(
      branchScoped
        ? 'id, invoice_number, client_id, deal_id, counselor_id, product_id, line_items, subtotal, tax_rate, tax_amount, total, currency, status, due_date, paid_at, notes, created_at, clients!inner(name, id, branch_id), counselors(name), products(name)'
        : 'id, invoice_number, client_id, deal_id, counselor_id, product_id, line_items, subtotal, tax_rate, tax_amount, total, currency, status, due_date, paid_at, notes, created_at, clients(name, id), counselors(name), products(name)'
    )
    .order('created_at', { ascending: false })

  if (branchScoped) {
    query = query.eq('clients.branch_id', admin.branch_id)
  }
  if (status && INVOICE_STATUSES.includes(status as InvoiceStatus)) {
    query = query.eq('status', status)
  }

  const { data, error: fetchError } = await query

  if (fetchError) {
    console.error('Invoices fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const invoices = (data ?? []).map((row) => {
    const invoice = mapInvoice(row)
    if (invoice.status === 'sent' && invoice.due_date && invoice.due_date < today) {
      return { ...invoice, status: 'overdue' }
    }
    return invoice
  })

  return NextResponse.json({ invoices })
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const body = await request.json()
  const { client_id, deal_id, counselor_id, line_items, due_date, notes, status, product_id } = body

  if (!client_id) {
    return NextResponse.json({ error: 'Client is required' }, { status: 400 })
  }

  const items: LineItem[] = Array.isArray(line_items) ? line_items : []
  const validItems = items.filter((i) => i.description?.trim() && Number(i.amount) > 0)
  if (validItems.length === 0) {
    return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })
  }

  const subtotal = validItems.reduce((sum, i) => sum + Number(i.amount), 0)
  const invoiceStatus = status === 'sent' ? 'sent' : 'draft'

  const supabase = createAdminClient()

  if (isBranchScopedAdmin(admin)) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('branch_id')
      .eq('id', client_id)
      .single()
    if (!clientRow || clientRow.branch_id !== admin.branch_id) {
      return NextResponse.json({ error: 'Client not in your branch' }, { status: 403 })
    }
  }

  const invoice_number = await generateInvoiceNumber(supabase)

  const { data, error: insertError } = await supabase
    .from('invoices')
    .insert({
      invoice_number,
      client_id,
      deal_id: deal_id || null,
      counselor_id: counselor_id || null,
      ...(product_id ? { product_id } : {}),
      line_items: validItems,
      subtotal,
      tax_rate: 0,
      tax_amount: 0,
      total: subtotal,
      status: invoiceStatus,
      due_date: due_date || null,
      notes: notes?.trim() || null,
    })
    .select(
      'id, invoice_number, client_id, deal_id, counselor_id, product_id, line_items, subtotal, tax_rate, tax_amount, total, currency, status, due_date, paid_at, notes, created_at, clients(name, id), counselors(name), products(name)'
    )
    .single()

  if (insertError) {
    console.error('Invoice insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }

  // ── Auto-create expense records for fixed-amount product vendors ──────────────
  if (product_id && data) {
    const [{ data: vendors }, { data: productRow }] = await Promise.all([
      supabase
        .from('product_vendors')
        .select('vendor_name, amount_type, amount')
        .eq('product_id', product_id)
        .eq('amount_type', 'fixed')
        .gt('amount', 0),
      supabase
        .from('products')
        .select('name')
        .eq('id', product_id)
        .single(),
    ])

    if (vendors && vendors.length > 0) {
      const today = new Date().toISOString().slice(0, 10)
      const productName = productRow?.name ?? 'Product'
      await supabase.from('expenses').insert(
        vendors.map((v) => ({
          category: 'other',
          description: `${v.vendor_name} — ${productName} (${invoice_number})`,
          amount: Number(v.amount),
          currency: 'PKR',
          paid_at: today,
          notes: `Auto-created from invoice ${invoice_number}`,
        }))
      )
    }
  }

  return NextResponse.json({ invoice: mapInvoice(data) })
}
