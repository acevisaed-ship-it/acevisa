import { NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

// GET — last 30 days of attendance for the logged-in counselor
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: counselor } = await admin
    .from('counselors')
    .select('id')
    .eq('email', user.email)
    .single()

  if (!counselor) return NextResponse.json({ error: 'Counselor not found' }, { status: 404 })

  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceStr = since.toISOString().slice(0, 10)

  const { data, error } = await admin
    .from('attendance_records')
    .select('id, date, check_in, check_out, status, notes')
    .eq('counselor_id', counselor.id)
    .gte('date', sinceStr)
    .order('date', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ records: data ?? [] })
}
