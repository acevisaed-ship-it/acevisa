import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { taskId, status, due_date } = body as {
    taskId?: string
    status?: string
    due_date?: string
  }

  if (!taskId || !status) {
    return NextResponse.json({ error: 'Missing taskId or status' }, { status: 400 })
  }

  const update: Record<string, string> = { status }
  if (due_date) update.due_date = due_date

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('tasks')
    .update(update)
    .eq('id', taskId)
    .eq('counselor_id', counselor.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
