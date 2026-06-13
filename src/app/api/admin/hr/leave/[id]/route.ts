import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/admin/hr/leave/[id] — approve or reject
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireAdminApi()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()
  const { status, reviewNote } = body

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('leave_applications')
    .update({
      status,
      review_note: reviewNote ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
