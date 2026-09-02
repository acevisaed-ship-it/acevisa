import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/admin/classes?branchId=&status=active|inactive|all — Branch
// Managers are always locked to their own branch; CEO can pick one or see
// all (same Idea #4 branch-filter pattern as Invoices/Payroll).
export async function GET(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const params = new URL(request.url).searchParams
  const requestedBranchId = params.get('branchId')
  const status = params.get('status') ?? 'active'

  const branchScoped = isBranchScopedAdmin(admin)
  const effectiveBranchId = branchScoped
    ? admin.branch_id
    : requestedBranchId && requestedBranchId !== 'all'
      ? requestedBranchId
      : null

  const supabase = createAdminClient()
  let query = supabase
    .from('classes')
    .select('id, branch_id, name, subject, instructor_name, schedule_days, schedule_time, is_active, created_at, branches(name)')
    .order('created_at', { ascending: false })

  if (effectiveBranchId) query = query.eq('branch_id', effectiveBranchId)
  if (status === 'active') query = query.eq('is_active', true)
  if (status === 'inactive') query = query.eq('is_active', false)

  const { data: classes, error: fetchError } = await query
  if (fetchError) {
    console.error('[admin/classes] fetch error:', fetchError.message)
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
  }

  const classIds = (classes ?? []).map((c) => c.id)
  const tally = new Map<string, number>()
  if (classIds.length > 0) {
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .in('class_id', classIds)
      .eq('status', 'active')
    for (const row of enrollments ?? []) {
      tally.set(row.class_id, (tally.get(row.class_id) ?? 0) + 1)
    }
  }

  const result = (classes ?? []).map((c) => {
    const branch = c.branches as unknown as { name: string } | null
    return {
      id: c.id as string,
      branchId: c.branch_id as string,
      branchName: branch?.name ?? '',
      name: c.name as string,
      subject: c.subject as string | null,
      instructorName: c.instructor_name as string | null,
      scheduleDays: (c.schedule_days as string[] | null) ?? [],
      scheduleTime: c.schedule_time as string | null,
      isActive: c.is_active as boolean,
      createdAt: c.created_at as string,
      enrolledCount: tally.get(c.id as string) ?? 0,
    }
  })

  return NextResponse.json({ classes: result })
}

// POST — create a class. Branch Managers create within their own branch;
// CEO must pick a branch explicitly.
export async function POST(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const body = (await request.json()) as {
    name?: string
    subject?: string
    instructorName?: string
    scheduleDays?: string[]
    scheduleTime?: string
    branchId?: string
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Class name is required' }, { status: 400 })
  }

  const branchScoped = isBranchScopedAdmin(admin)
  const branchId = branchScoped ? admin.branch_id : body.branchId
  if (!branchId) {
    return NextResponse.json({ error: 'A branch is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: created, error: insertError } = await supabase
    .from('classes')
    .insert({
      branch_id: branchId,
      name: body.name.trim(),
      subject: body.subject?.trim() || null,
      instructor_name: body.instructorName?.trim() || null,
      schedule_days: body.scheduleDays?.length ? body.scheduleDays : null,
      schedule_time: body.scheduleTime?.trim() || null,
      created_by: admin.id,
    })
    .select('id')
    .single()

  if (insertError || !created) {
    console.error('[admin/classes] insert error:', insertError?.message)
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: created.id })
}
