import { createAdminClient, getAuthenticatedAdmin } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ counselorId: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { counselorId } = await params
  const supabase = createAdminClient()

  const { data: counselor } = await supabase
    .from('counselors')
    .select('id, role, status')
    .eq('id', counselorId)
    .single()

  if (!counselor || counselor.role !== 'counselor' || counselor.status !== 'active') {
    return NextResponse.json({ error: 'Counselor not found' }, { status: 404 })
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select(
      'id, task_text, due_date, status, notes_count, negligence_flagged, clients(name, id)'
    )
    .eq('counselor_id', counselorId)
    .order('due_date', { ascending: true, nullsFirst: false })

  return NextResponse.json({ tasks: tasks ?? [], counselorId })
}
