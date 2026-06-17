import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/counselor/objectives/[id]  { status: 'completed' | 'active' }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { status } = await request.json()

  if (!['active', 'completed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('counselor_objectives')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ objective: data })
}
