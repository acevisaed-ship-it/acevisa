import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/admin/classes/[id] — toggle a class active/inactive (archive).
// Branch Managers may only touch classes in their own branch.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const { id } = await params
  const body = (await request.json()) as { isActive?: boolean }
  if (typeof body.isActive !== 'boolean') {
    return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: row } = await supabase.from('classes').select('branch_id').eq('id', id).maybeSingle()
  if (!row) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  }
  if (isBranchScopedAdmin(admin) && row.branch_id !== admin.branch_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: updateError } = await supabase
    .from('classes')
    .update({ is_active: body.isActive })
    .eq('id', id)

  if (updateError) {
    console.error('[admin/classes/[id]] update error:', updateError.message)
    return NextResponse.json({ error: 'Failed to update class' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
