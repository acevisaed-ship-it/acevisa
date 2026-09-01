import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { parseMonth } from '@/lib/admin/parseMonth'
import { parseClientJoin } from '@/lib/admin/parseCounselorJoin'
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/lib/admin/dealTypes'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const VALID_TYPES = ['pl', 'invoices', 'expenses', 'commissions'] as const
type ExportType = (typeof VALID_TYPES)[number]

// Header style helper — openpyxl-style XLSX cell metadata
function hdr(v: string) {
  return { v, t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: 'F0F4F0' } } } }
}

function buildPL(data: {
  month: string
  summary: { totalInvoiced: number; totalCollected: number; totalExpenses: number; net: number }
  income: { invoiceNumber: string; clientName: string; amount: number; paidAt: string }[]
  expenses: { label: string; category: string; amount: number }[]
}) {
  const wb = XLSX.utils.book_new()

  // Summary sheet
  const summaryRows = [
    [hdr('P&L Summary'), hdr(data.month)],
    [],
    [hdr('Metric'), hdr('Amount (PKR)')],
    ['Total Invoiced', data.summary.totalInvoiced],
    ['Total Collected (Paid)', data.summary.totalCollected],
    ['Total Expenses', data.summary.totalExpenses],
    ['Net (Collected − Expenses)', data.summary.net],
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  // Income sheet
  const incomeRows = [
    [hdr('Invoice #'), hdr('Client'), hdr('Amount (PKR)'), hdr('Paid On')],
    ...data.income.map((r) => [r.invoiceNumber, r.clientName, r.amount, r.paidAt ?? '']),
    [],
    ['', hdr('TOTAL'), { v: `=SUM(C2:C${data.income.length + 1})`, t: 'n' }],
  ]
  const incomeSheet = XLSX.utils.aoa_to_sheet(incomeRows)
  incomeSheet['!cols'] = [{ wch: 18 }, { wch: 24 }, { wch: 18 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, incomeSheet, 'Income (Paid Invoices)')

  // Expenses sheet
  const expRows = [
    [hdr('Category'), hdr('Amount (PKR)')],
    ...data.expenses.map((r) => [r.label, r.amount]),
    [],
    [hdr('TOTAL'), { v: `=SUM(B2:B${data.expenses.length + 1})`, t: 'n' }],
  ]
  const expSheet = XLSX.utils.aoa_to_sheet(expRows)
  expSheet['!cols'] = [{ wch: 22 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, expSheet, 'Expenses by Category')

  return wb
}

function buildInvoices(
  invoices: {
    invoice_number: string; client_name: string | null; counselor_name: string | null
    amount: number; status: string; due_date: string | null; paid_at: string | null; created_at: string
  }[]
) {
  const wb = XLSX.utils.book_new()
  const rows = [
    [hdr('Invoice #'), hdr('Client'), hdr('Counselor'), hdr('Amount (PKR)'), hdr('Status'), hdr('Due Date'), hdr('Paid On'), hdr('Created')],
    ...invoices.map((i) => [
      i.invoice_number,
      i.client_name ?? '',
      i.counselor_name ?? '',
      i.amount,
      i.status,
      i.due_date ?? '',
      i.paid_at ? i.paid_at.slice(0, 10) : '',
      i.created_at.slice(0, 10),
    ]),
    [],
    ['', '', hdr('TOTAL'), { v: `=SUM(D2:D${invoices.length + 1})`, t: 'n' }],
  ]
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, sheet, 'Client Invoices')
  return wb
}

function buildExpenses(
  expenses: { category: string; description: string; amount: number; paid_at: string; notes: string | null }[]
) {
  const wb = XLSX.utils.book_new()
  const rows = [
    [hdr('Date'), hdr('Category'), hdr('Description'), hdr('Amount (PKR)'), hdr('Notes')],
    ...expenses.map((e) => [
      e.paid_at,
      EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] ?? e.category,
      e.description,
      e.amount,
      e.notes ?? '',
    ]),
    [],
    ['', '', hdr('TOTAL'), { v: `=SUM(D2:D${expenses.length + 1})`, t: 'n' }],
  ]
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 34 }, { wch: 16 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, sheet, 'Expenses')
  return wb
}

function buildCommissions(
  commissions: {
    counselorName: string; dealsClosed: number; totalDealValue: number
    commissionRate: number; commissionAmount: number
  }[]
) {
  const wb = XLSX.utils.book_new()
  const rows = [
    [hdr('Counselor'), hdr('Deals Closed'), hdr('Deal Value (PKR)'), hdr('Rate %'), hdr('Commission (PKR)')],
    ...commissions.map((r) => [
      r.counselorName,
      r.dealsClosed,
      r.totalDealValue,
      r.commissionRate / 100,   // store as decimal so Excel % format works
      r.commissionAmount,
    ]),
    [],
    [hdr('TOTAL'), { v: `=SUM(B2:B${commissions.length + 1})`, t: 'n' }, { v: `=SUM(C2:C${commissions.length + 1})`, t: 'n' }, '', { v: `=SUM(E2:E${commissions.length + 1})`, t: 'n' }],
  ]
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 10 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, sheet, 'Commissions')
  return wb
}

export async function GET(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const url = new URL(request.url)
  const type = url.searchParams.get('type') as ExportType | null
  const monthParam = url.searchParams.get('month')

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'type must be one of: pl, invoices, expenses, commissions' }, { status: 400 })
  }

  const { month, start, end, startDate, endDate } = parseMonth(monthParam)
  const supabase = createAdminClient()

  let wb: XLSX.WorkBook
  let filename: string

  if (type === 'pl') {
    const [{ data: invoiceData }, { data: expenseData }] = await Promise.all([
      supabase
        .from('invoices')
        .select('invoice_number, total, status, paid_at, clients(name, id)')
        .is('deleted_at', null)
        .gte('created_at', start)
        .lt('created_at', end),
      supabase
        .from('expenses')
        .select('category, description, amount, paid_at')
        .is('deleted_at', null)
        .gte('paid_at', startDate)
        .lt('paid_at', endDate),
    ])

    const paidInvoices = (invoiceData ?? []).filter(
      (i) => i.status === 'paid' && i.paid_at && i.paid_at >= start && i.paid_at < end
    )
    const income = paidInvoices.map((i) => {
      const c = parseClientJoin(i.clients as { name: string; id: string } | { name: string; id: string }[] | null)
      return { invoiceNumber: i.invoice_number, clientName: c?.name ?? 'Unknown', amount: Number(i.total), paidAt: i.paid_at?.slice(0, 10) ?? '' }
    })

    const expMap: Record<string, number> = {}
    for (const e of expenseData ?? []) { expMap[e.category] = (expMap[e.category] ?? 0) + Number(e.amount) }
    const expBreakdown = Object.entries(expMap).map(([cat, amt]) => ({
      category: cat,
      label: EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory] ?? cat,
      amount: amt,
    }))

    const totalCollected = income.reduce((s, i) => s + i.amount, 0)
    const totalExpenses = expBreakdown.reduce((s, e) => s + e.amount, 0)
    const totalInvoiced = (invoiceData ?? []).reduce((s, i) => s + Number(i.total), 0)

    wb = buildPL({
      month,
      summary: { totalInvoiced, totalCollected, totalExpenses, net: totalCollected - totalExpenses },
      income,
      expenses: expBreakdown,
    })
    filename = `ACE-PL-${month}.xlsx`

  } else if (type === 'invoices') {
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number, total, status, due_date, paid_at, created_at, clients(name, id), counselors(name)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    const rows = (data ?? []).map((i) => {
      const c = parseClientJoin(i.clients as { name: string; id: string } | { name: string; id: string }[] | null)
      const csl = i.counselors as { name: string } | { name: string }[] | null
      const counselorName = Array.isArray(csl) ? csl[0]?.name : csl?.name
      return {
        invoice_number: i.invoice_number,
        client_name: c?.name ?? null,
        counselor_name: counselorName ?? null,
        amount: Number(i.total),
        status: i.status,
        due_date: i.due_date ?? null,
        paid_at: i.paid_at ?? null,
        created_at: i.created_at,
      }
    })
    wb = buildInvoices(rows)
    filename = `ACE-Invoices-${month}.xlsx`

  } else if (type === 'expenses') {
    const { data } = await supabase
      .from('expenses')
      .select('category, description, amount, paid_at, notes')
      .is('deleted_at', null)
      .gte('paid_at', startDate)
      .lt('paid_at', endDate)
      .order('paid_at', { ascending: false })

    wb = buildExpenses(data ?? [])
    filename = `ACE-Expenses-${month}.xlsx`

  } else {
    // commissions
    const [{ data: rules }, { data: deals }, { data: counselors }] = await Promise.all([
      supabase.from('commission_rules').select('counselor_id, commission_rate'),
      supabase
        .from('deals')
        .select('counselor_id, deal_value, actual_close_date, signed_at')
        .in('stage', ['completed', 'agreement_signed']),
      supabase.from('counselors').select('id, name').eq('role', 'counselor').eq('status', 'active').order('name'),
    ])

    const dealsThisMonth = (deals ?? []).filter((d) => {
      const date = d.actual_close_date || (d.signed_at ? d.signed_at.slice(0, 10) : null)
      return date && date >= startDate && date < endDate
    })

    const commissions = (counselors ?? []).map((c) => {
      const rule = (rules ?? []).find((r) => r.counselor_id === c.id)
      const rate = Number(rule?.commission_rate ?? 10)
      const myDeals = dealsThisMonth.filter((d) => d.counselor_id === c.id)
      const totalDealValue = myDeals.reduce((s, d) => s + Number(d.deal_value), 0)
      return { counselorName: c.name, dealsClosed: myDeals.length, totalDealValue, commissionRate: rate, commissionAmount: Math.round((totalDealValue * rate) / 100) }
    })

    wb = buildCommissions(commissions)
    filename = `ACE-Commissions-${month}.xlsx`
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
