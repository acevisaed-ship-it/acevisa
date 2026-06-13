import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/admin/hr/leave?status=pending&counselorId=...
export async function GET(request: Request) {
  const { error: authError } = await requireAdminApi()
  if (authError) return authError

  const sp = new URL(request.url).searchParams
  const status = sp.get('status') // pending | approved | rejected | all
  const counselorId = sp.get('counselorId')

  const supabase = createAdminClient()

  let query = supabase
    .from('leave_applications')
    .select(
      'id, counselor_id, leave_type, start_date, end_date, reason, status, review_note, reviewed_at, created_at, counselors!leave_applications_counselor_id_fkey(name)'
    )
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (counselorId) query = query.eq('counselor_id', counselorId)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ applications: data ?? [] })
}

// POST /api/admin/hr/leave — submit a leave application
export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi()
  if (authError) return authError

  const body = await request.json()
  const { counselorId, leaveType, startDate, endDate, reason } = body

  if (!counselorId || !startDate || !endDate) {
    return NextResponse.json({ error: 'counselorId, startDate, endDate required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('leave_applications')
    .insert({
      counselor_id: counselorId,
      leave_type: leaveType ?? 'annual',
      start_date: startDate,
      end_date: endDate,
      reason: reason ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ application: data })
}
