import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/lib/admin/dealTypes'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const month = url.searchParams.get('month') // YYYY-MM

  const branchScoped = isBranchScopedAdmin(admin)
  const supabase = createAdminClient()

  let branchCounselorIds: string[] | null = null
  if (branchScoped) {
    const { data: branchCounselors } = await supabase
      .from('counselors')
      .select('id')
      .eq('branch_id', admin.branch_id)
    branchCounselorIds = (branchCounselors ?? []).map((c) => c.id)
  }

  let query = supabase
    .from('expenses')
    .select('id, category, description, amount, currency, paid_at, notes, created_at, counselor_id')
    .order('paid_at', { ascending: false })

  if (branchCounselorIds) {
    query = query.in('counselor_id', branchCounselorIds.length > 0 ? branchCounselorIds : [''])
  }

  if (category && EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
    query = query.eq('category', category)
  }

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const start = `${month}-01`
    const [y, m] = month.split('-').map(Number)
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    query = query.gte('paid_at', start).lt('paid_at', next)
  }

  const { data, error: fetchError } = await query

  if (fetchError) {
    console.error('Expenses fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }

  return NextResponse.json({ expenses: data ?? [] })
}

export async function POST(request: Request) {
  const { error, admin } = await requireAdminApi()
  if (error) return error

  const body = await request.json()
  const { category, description, amount, paid_at, notes, subcategory, counselor_id, receipt_url } = body

  if (!category || !EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
    return NextResponse.json({ error: 'Valid category is required' }, { status: 400 })
  }
  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
  }
  if (!paid_at) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  if (isBranchScopedAdmin(admin) && counselor_id) {
    const { data: counselorRow } = await supabase
      .from('counselors')
      .select('branch_id')
      .eq('id', counselor_id)
      .single()
    if (!counselorRow || counselorRow.branch_id !== admin.branch_id) {
      return NextResponse.json({ error: 'Counselor not in your branch' }, { status: 403 })
    }
  }

  const { data, error: insertError } = await supabase
    .from('expenses')
    .insert({
      category,
      subcategory: subcategory?.trim() || null,
      description: description.trim(),
      amount: Number(amount),
      currency: 'PKR',
      paid_at,
      recorded_by: admin?.id ?? null,
      notes: notes?.trim() || null,
      counselor_id: counselor_id || null,
      receipt_url: receipt_url || null,
    })
    .select('id, category, subcategory, description, amount, currency, paid_at, notes, receipt_url, created_at')
    .single()

  if (insertError) {
    console.error('Expense insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }

  return NextResponse.json({ expense: data })
}

export async function DELETE(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error: deleteError } = await supabase.from('expenses').delete().eq('id', id)

  if (deleteError) {
    console.error('Expense delete error:', deleteError)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
