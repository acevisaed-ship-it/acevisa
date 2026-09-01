import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import {
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from '@/lib/admin/dealTypes'
import { parseMonth } from '@/lib/admin/parseMonth'
import { parseClientJoin } from '@/lib/admin/parseCounselorJoin'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const params = new URL(request.url).searchParams
  const monthParam = params.get('month')
  const { month, start, end, startDate, endDate } = parseMonth(monthParam)

  const branchScoped = isBranchScopedAdmin(admin)
  // Branch Manager stays locked to their own branch; CEO/unscoped admin can
  // optionally pick one branch via ?branchId= ('all'/omitted = every branch)
  // — Idea #4 universal branch filtering, extended to Payroll.
  const requestedBranchId = params.get('branchId')
  const effectiveBranchId = branchScoped
    ? admin.branch_id
    : requestedBranchId && requestedBranchId !== 'all'
      ? requestedBranchId
      : null

  const supabase = createAdminClient()

  let invoicesQuery = supabase
    .from('invoices')
    .select(
      effectiveBranchId
        ? 'id, invoice_number, total, status, created_at, paid_at, clients!inner(name, branch_id)'
        : 'id, invoice_number, total, status, created_at, paid_at, clients(name)'
    )
    .is('deleted_at', null)
    .gte('created_at', start)
    .lt('created_at', end)

  let counselorsQuery = supabase
    .from('counselors')
    .select('id, name')
    .eq('role', 'counselor')
    .eq('status', 'active')
    .order('name')

  let closedDealsQuery = supabase
    .from('deals')
    .select(
      effectiveBranchId
        ? 'id, counselor_id, deal_value, stage, signed_at, actual_close_date, counselors!inner(name, branch_id)'
        : 'id, counselor_id, deal_value, stage, signed_at, actual_close_date, counselors(name, branch_id)'
    )
    .in('stage', ['completed', 'agreement_signed'])

  if (effectiveBranchId) {
    invoicesQuery = invoicesQuery.eq('clients.branch_id', effectiveBranchId)
    counselorsQuery = counselorsQuery.eq('branch_id', effectiveBranchId)
    closedDealsQuery = closedDealsQuery.eq('counselors.branch_id', effectiveBranchId)
  }

  const [
    { data: invoices },
    { data: expenses },
    { data: commissionRules },
    { data: closedDeals },
    { data: counselors },
  ] = await Promise.all([
    invoicesQuery,
    supabase
      .from('expenses')
      .select('id, category, description, amount, paid_at')
      .is('deleted_at', null)
      .gte('paid_at', startDate)
      .lt('paid_at', endDate),
    supabase.from('commission_rules').select('counselor_id, commission_rate, base_salary'),
    closedDealsQuery,
    counselorsQuery,
  ])

  const totalInvoiced = (invoices ?? []).reduce((sum, i) => sum + Number(i.total), 0)

  const paidInvoices = (invoices ?? []).filter(
    (i) => i.status === 'paid' && i.paid_at && i.paid_at >= start && i.paid_at < end
  )
  const totalCollected = paidInvoices.reduce((sum, i) => sum + Number(i.total), 0)

  const totalExpenses = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)

  const incomeBreakdown = paidInvoices.map((i) => {
    const client = parseClientJoin(
      i.clients as { name: string; id: string } | { name: string; id: string }[] | null
    )
    return {
      invoiceNumber: i.invoice_number,
      clientName: client?.name ?? 'Unknown',
      amount: Number(i.total),
      paidAt: i.paid_at,
    }
  })

  const expensesByCategory: Record<string, number> = {}
  for (const expense of expenses ?? []) {
    const cat = expense.category as string
    expensesByCategory[cat] = (expensesByCategory[cat] ?? 0) + Number(expense.amount)
  }

  const expenseBreakdown = Object.entries(expensesByCategory).map(([category, amount]) => ({
    category,
    label: EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] ?? category,
    amount,
  }))

  const dealsClosedThisMonth = (closedDeals ?? []).filter((d) => {
    const closeDate = d.actual_close_date || (d.signed_at ? d.signed_at.slice(0, 10) : null)
    if (!closeDate) return false
    return closeDate >= startDate && closeDate < endDate
  })

  const commissions = (counselors ?? []).map((counselor) => {
    const rule = (commissionRules ?? []).find((r) => r.counselor_id === counselor.id)
    const rate = Number(rule?.commission_rate ?? 10)
    const counselorDeals = dealsClosedThisMonth.filter((d) => d.counselor_id === counselor.id)
    const totalDealValue = counselorDeals.reduce((sum, d) => sum + Number(d.deal_value), 0)
    const commissionAmount = (totalDealValue * rate) / 100

    return {
      counselorId: counselor.id,
      counselorName: counselor.name,
      dealsClosed: counselorDeals.length,
      totalDealValue,
      commissionRate: rate,
      commissionAmount: Math.round(commissionAmount),
    }
  })

  return NextResponse.json({
    month,
    summary: {
      totalInvoiced,
      totalCollected,
      totalExpenses,
      net: totalCollected - totalExpenses,
    },
    incomeBreakdown,
    expenseBreakdown,
    commissions,
  })
}
