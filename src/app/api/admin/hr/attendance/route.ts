import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/admin/hr/attendance?month=2026-06&counselorId=...
export async function GET(request: Request) {
  const { error: authError } = await requireAdminApi()
  if (authError) return authError

  const sp = new URL(request.url).searchParams
  const month = sp.get('month') ?? new Date().toISOString().slice(0, 7)
  const counselorId = sp.get('counselorId')

  const [y, m] = month.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10)
  const end = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10)

  const supabase = createAdminClient()

  let query = supabase
    .from('attendance_records')
    .select('id, counselor_id, date, check_in, check_out, status, notes, counselors(name)')
    .gte('date', start)
    .lt('date', end)
    .order('date', { ascending: false })

  if (counselorId) query = query.eq('counselor_id', counselorId)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ records: data ?? [] })
}

// POST /api/admin/hr/attendance — create or update a record
export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi()
  if (authError) return authError

  const body = await request.json()
  const { counselorId, date, checkIn, checkOut, status, notes } = body

  if (!counselorId || !date) {
    return NextResponse.json({ error: 'counselorId and date required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(
      {
        counselor_id: counselorId,
        date,
        check_in: checkIn ?? null,
        check_out: checkOut ?? null,
        status: status ?? 'present',
        notes: notes ?? null,
      },
      { onConflict: 'counselor_id,date' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ record: data })
}
