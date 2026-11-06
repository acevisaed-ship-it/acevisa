import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('terms_documents')
    .select('id, published_at')
    .eq('id', id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }
  if (existing.published_at) {
    return NextResponse.json(
      { error: 'Published terms cannot be edited. Create a new draft instead.' },
      { status: 400 }
    )
  }

  const updates: Record<string, string> = {}
  if (typeof body.title === 'string' && body.title.trim()) updates.title = body.title.trim()
  if (typeof body.body === 'string' && body.body.trim()) updates.body = body.body.trim()
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error: updateError } = await supabase
    .from('terms_documents')
    .update(updates)
    .eq('id', id)
    .select(
      'id, scope, product_id, title, body, version, is_active, published_at, published_by, created_at'
    )
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }
  return NextResponse.json({ document: data })
}
