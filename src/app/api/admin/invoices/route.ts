import { INVOICE_STATUSES, type InvoiceStatus } from '@/lib/admin/dealTypes'
import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { mapInvoice } from '@/lib/invoices/mapInvoice'
import { INVOICE_SELECT, INVOICE_SELECT_BRANCH } from '@/lib/invoices/types'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type LineItem = { description: string; amount: number }

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

  const params = new URL(request.url).searchParams
  const status = params.get('status')
  const from = params.get('from')
  const to = params.get('to')
  const requestedBranchId = params.get('branchId')

  const branchScoped = isBranchScopedAdmin(admin)
  const effectiveBranchId = branchScoped
    ? admin.branch_id
    : requestedBranchId && requestedBranchId !== 'all'
      ? requestedBranchId
      : null

  const supabase = createAdminClient()
  let query = supabase
    .from('invoices')
    .select(effectiveBranchId ? INVOICE_SELECT_BRANCH : INVOICE_SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (effectiveBranchId) {
    query = query.eq('clients.branch_id', effectiveBranchId)
  }
  if (status && INVOICE_STATUSES.includes(status as InvoiceStatus)) {
    query = query.eq('status', status)
  }
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    query = query.gte('created_at', from)
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    query = query.lt('created_at', to)
  }

  const { data, error: fetchError } = await query

  if (fetchError) {
    console.error('[invoices GET] fetch failed:', {
      message: fetchError.message,
      code: fetchError.code,
      details: fetchError.details,
      hint: fetchError.hint,
    })
    return NextResponse.json(
      { error: `Failed to fetch invoices: ${fetchError.message}` },
      { status: 500 }
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const invoices = (data ?? []).map((row) => {
    const invoice = mapInvoice(row as unknown as Record<string, unknown>)
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
  const { client_id, deal_id, line_items, due_date, notes, product_id } = body

  if (!client_id) {
    return NextResponse.json({ error: 'Client is required' }, { status: 400 })
  }

  const items: LineItem[] = Array.isArray(line_items) ? line_items : []
  const validItems = items.filter((i) => i.description?.trim() && Number(i.amount) > 0)
  if (validItems.length === 0) {
    return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })
  }

  const subtotal = validItems.reduce((sum, i) => sum + Number(i.amount), 0)
  const supabase = createAdminClient()

  const { data: clientRow } = await supabase
    .from('clients')
    .select('branch_id, counselor_id')
    .eq('id', client_id)
    .single()

  if (!clientRow) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  if (isBranchScopedAdmin(admin) && clientRow.branch_id !== admin.branch_id) {
    return NextResponse.json({ error: 'Client not in your branch' }, { status: 403 })
  }

  const invoice_number = await generateInvoiceNumber(supabase)
  const counselorId = clientRow.counselor_id || null

  const insertPayload = {
    invoice_number,
    client_id,
    deal_id: deal_id || null,
    counselor_id: counselorId,
    ...(product_id ? { product_id } : {}),
    line_items: validItems,
    subtotal,
    tax_rate: 0,
    tax_amount: 0,
    total: subtotal,
    status: 'draft',
    due_date: due_date || null,
    notes: notes?.trim() || null,
  }

  console.info('[invoices POST] inserting', {
    invoice_number,
    client_id,
    deal_id: insertPayload.deal_id,
    counselor_id: counselorId,
    product_id: product_id || null,
    itemCount: validItems.length,
    subtotal,
    status: 'draft',
  })

  const { data, error: insertError } = await supabase
    .from('invoices')
    .insert(insertPayload)
    .select(INVOICE_SELECT)
    .single()

  if (insertError) {
    console.error('[invoices POST] insert failed:', {
      message: insertError.message,
      code: insertError.code,
      details: insertError.details,
      hint: insertError.hint,
      invoice_number,
      client_id,
      product_id: product_id || null,
      counselor_id: counselorId,
    })
    return NextResponse.json(
      { error: `Failed to create invoice: ${insertError.message}` },
      { status: 500 }
    )
  }

  if (product_id && data) {
    const [{ data: vendors }, { data: productRow }] = await Promise.all([
      supabase
        .from('product_vendors')
        .select('vendor_name, amount_type, amount')
        .eq('product_id', product_id)
        .eq('amount_type', 'fixed')
        .gt('amount', 0),
      supabase.from('products').select('name').eq('id', product_id).single(),
    ])

    if (vendors && vendors.length > 0) {
      const today = new Date().toISOString().slice(0, 10)
      const productName = productRow?.name ?? 'Product'
      const { error: expenseError } = await supabase.from('expenses').insert(
        vendors.map((v) => ({
          category: 'other',
          description: `${v.vendor_name} — ${productName} (${invoice_number})`,
          amount: Number(v.amount),
          currency: 'PKR',
          paid_at: today,
          notes: `Auto-created from invoice ${invoice_number}`,
        }))
      )
      if (expenseError) {
        console.error('[invoices POST] vendor expense insert failed:', {
          message: expenseError.message,
          code: expenseError.code,
          details: expenseError.details,
          invoice_number,
          product_id,
        })
      }
    }
  }

  return NextResponse.json({ invoice: mapInvoice(data as Record<string, unknown>) })
}
