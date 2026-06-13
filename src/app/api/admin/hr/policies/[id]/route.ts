import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/admin/hr/policies/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireAdminApi()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()
  const { title, content, isActive } = body

  const supabase = createAdminClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (title !== undefined) updates.title = title
  if (content !== undefined) {
    updates.content = content
    // bump version on content change
    const { data: existing } = await supabase
      .from('hr_policies')
      .select('version')
      .eq('id', id)
      .single()
    updates.version = (existing?.version ?? 1) + 1
  }
  if (isActive !== undefined) updates.is_active = isActive

  const { error } = await supabase.from('hr_policies').update(updates).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/hr/policies/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireAdminApi()
  if (authError) return authError

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase.from('hr_policies').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
