import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ taskId: string }> }

export async function PATCH(_request: Request, { params }: Params) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { taskId } = await params
  const supabase = createAdminClient()

  const { data: task, error: updateError } = await supabase
    .from('tasks')
    .update({ negligence_flagged: false })
    .eq('id', taskId)
    .select('id, negligence_flagged')
    .single()

  if (updateError) {
    console.error('Resolve flag error:', updateError)
    return NextResponse.json({ error: 'Failed to resolve flag' }, { status: 500 })
  }

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  return NextResponse.json({ task })
}
