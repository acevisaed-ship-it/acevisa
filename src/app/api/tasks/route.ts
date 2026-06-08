import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select(
      'id, task_text, due_date, status, notes_count, negligence_flagged, clients(name, id)'
    )
    .eq('counselor_id', counselor.id)
    .order('due_date', { ascending: true, nullsFirst: false })

  return NextResponse.json({ tasks: tasks ?? [], counselorId: counselor.id })
}
