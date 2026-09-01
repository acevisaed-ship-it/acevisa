import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/lib/admin/dealTypes'
import { parseClientJoin } from '@/lib/admin/parseCounselorJoin'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Mode = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

function getPeriodRange(mode: Mode, date: string, from: string, to: string) {
  const ref = date ? new Date(date + 'T00:00:00Z') : new Date()

  if (mode === 'custom') {
    const f = from || ref.toISOString().slice(0, 10)
    const tDate = new Date((to || f) + 'T00:00:00Z')
    tDate.setUTCDate(tDate.getUTCDate() + 1)
    return { start: f + 'T00:00:00.000Z', end: tDate.toISOString(), label: `${f} → ${to || f}` }
  }

  if (mode === 'daily') {
    const d = ref.toISOString().slice(0, 10)
    return {
      start: d + 'T00:00:00.000Z',
      end: d + 'T23:59:59.999Z',
      label: new Date(d).toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    }
  }

  if (mode === 'weekly') {
    const day = ref.getUTCDay() // 0=Sun
    const startOfWeek = new Date(ref)
    startOfWeek.setUTCDate(ref.getUTCDate() - day)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 7)
    return {
      start: startOfWeek.toISOString().slice(0, 10) + 'T00:00:00.000Z',
      end: endOfWeek.toISOString().slice(0, 10) + 'T00:00:00.000Z',
      label: `Week of ${startOfWeek.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    }
  }

  if (mode === 'yearly') {
    const y = ref.getUTCFullYear()
    return {
      start: `${y}-01-01T00:00:00.000Z`,
      end: `${y + 1}-01-01T00:00:00.000Z`,
      label: String(y),
    }
  }

  // monthly (default)
  const y = ref.getUTCFullYear()
  const m = ref.getUTCMonth()
  const start = new Date(Date.UTC(y, m, 1))
  const end = new Date(Date.UTC(y, m + 1, 1))
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: start.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' }),
  }
}

export async function GET(request: Request) {
  const { admin, error: authError } = await requireAdminApi()
  if (authError) return authError

  const sp = new URL(request.url).searchParams
  const mode = (sp.get('mode') ?? 'monthly') as Mode
  const date = sp.get('date') ?? ''
  const from = sp.get('from') ?? ''
  const to = sp.get('to') ?? ''

  const { start, end, label } = getPeriodRange(mode, date, from, to)

  const branchScoped = isBranchScopedAdmin(admin)
  const supabase = createAdminClient()

  let invoicesQuery = supabase
    .from('invoices')
    .select(
      branchScoped
        ? 'id, invoice_number, total, status, created_at, paid_at, clients!inner(name, id, branch_id)'
        : 'id, invoice_number, total, status, created_at, paid_at, clients(name, id)'
    )
    .is('deleted_at', null)
    .gte('paid_at', start)
    .lte('paid_at', end)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })

  let counselorsQuery = supabase
    .from('counselors')
    .select('id, name')
    .eq('role', 'counselor')
    .eq('status', 'active')
    .order('name')

  let closedDealsQuery = supabase
    .from('deals')
    .select('id, counselor_id, deal_value, stage, signed_at, actual_close_date, counselors(branch_id)')
    .in('stage', ['completed', 'agreement_signed'])
    .gte('actual_close_date', start.slice(0, 10))
    .lte('actual_close_date', end.slice(0, 10))

  if (branchScoped) {
    invoicesQuery = invoicesQuery.eq('clients.branch_id', admin.branch_id)
    counselorsQuery = counselorsQuery.eq('branch_id', admin.branch_id)
    closedDealsQuery = closedDealsQuery.eq('counselors.branch_id', admin.branch_id)
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
      .select('id, category, subcategory, description, amount, paid_at, created_at')
      .is('deleted_at', null)
      .gte('paid_at', start)
      .lte('paid_at', end)
      .order('category')
      .order('paid_at', { ascending: false }),
    supabase.from('commission_rules').select('counselor_id, commission_rate, base_salary'),
    closedDealsQuery,
    counselorsQuery,
  ])

  // Income — individual paid invoices
  const incomeItems = (invoices ?? []).map((i) => {
    const client = parseClientJoin(
      i.clients as { name: string; id: string } | { name: string; id: string }[] | null
    )
    return {
      id: i.id,
      invoiceNumber: i.invoice_number,
      clientName: client?.name ?? 'Unknown',
      amount: Number(i.total),
      paidAt: i.paid_at,
    }
  })
  const totalCollected = incomeItems.reduce((s, r) => s + r.amount, 0)

  // Expenses — group by category → subcategory → individual items
  type ExpenseItem = {
    id: string
    description: string
    subcategory: string | null
    amount: number
    paidAt: string
  }
  type ExpenseCategoryGroup = {
    category: string
    label: string
    total: number
    subcategories: Record<string, { label: string; total: number; items: ExpenseItem[] }>
    items: ExpenseItem[] // items with no subcategory
  }

  const categoryMap: Record<string, ExpenseCategoryGroup> = {}
  for (const exp of expenses ?? []) {
    const cat = exp.category as string
    if (!categoryMap[cat]) {
      categoryMap[cat] = {
        category: cat,
        label: EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory] ?? cat,
        total: 0,
        subcategories: {},
        items: [],
      }
    }
    const item: ExpenseItem = {
      id: exp.id,
      description: exp.description ?? '(no description)',
      subcategory: exp.subcategory ?? null,
      amount: Number(exp.amount),
      paidAt: exp.paid_at,
    }
    categoryMap[cat].total += item.amount

    if (exp.subcategory) {
      if (!categoryMap[cat].subcategories[exp.subcategory]) {
        categoryMap[cat].subcategories[exp.subcategory] = {
          label: exp.subcategory,
          total: 0,
          items: [],
        }
      }
      categoryMap[cat].subcategories[exp.subcategory].total += item.amount
      categoryMap[cat].subcategories[exp.subcategory].items.push(item)
    } else {
      categoryMap[cat].items.push(item)
    }
  }

  const expenseCategories = Object.values(categoryMap).sort((a, b) => b.total - a.total)
  const totalExpenses = expenseCategories.reduce((s, c) => s + c.total, 0)

  // Commissions
  const commissions = (counselors ?? []).map((counselor) => {
    const rule = (commissionRules ?? []).find((r) => r.counselor_id === counselor.id)
    const rate = Number(rule?.commission_rate ?? 10)
    const counselorDeals = (closedDeals ?? []).filter((d) => d.counselor_id === counselor.id)
    const totalDealValue = counselorDeals.reduce((sum, d) => sum + Number(d.deal_value), 0)
    return {
      counselorId: counselor.id,
      counselorName: counselor.name,
      dealsClosed: counselorDeals.length,
      totalDealValue,
      commissionRate: rate,
      commissionAmount: Math.round((totalDealValue * rate) / 100),
    }
  })

  return NextResponse.json({
    period: { mode, label, start, end },
    summary: {
      totalCollected,
      totalExpenses,
      net: totalCollected - totalExpenses,
      transactionCount: incomeItems.length,
      expenseCount: (expenses ?? []).length,
    },
    incomeItems,
    expenseCategories,
    commissions,
  })
}
