import { KB_CATEGORIES } from '@/lib/admin/categories'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.category !== undefined) {
    if (!KB_CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    updates.category = body.category
  }
  if (body.topic !== undefined) updates.topic = String(body.topic).trim()
  if (body.answer !== undefined) updates.answer = String(body.answer).trim()
  if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active)

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: entry, error: updateError } = await supabase
    .from('knowledge_base')
    .update(updates)
    .eq('id', id)
    .select('id, category, topic, answer, is_active, added_at')
    .single()

  if (updateError) {
    console.error('Knowledge base update error:', updateError)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }

  return NextResponse.json({ entry })
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()
  const { data: entry, error: updateError } = await supabase
    .from('knowledge_base')
    .update({ is_active: false })
    .eq('id', id)
    .select('id, category, topic, answer, is_active, added_at')
    .single()

  if (updateError) {
    console.error('Knowledge base delete error:', updateError)
    return NextResponse.json({ error: 'Failed to deactivate entry' }, { status: 500 })
  }

  return NextResponse.json({ entry })
}
