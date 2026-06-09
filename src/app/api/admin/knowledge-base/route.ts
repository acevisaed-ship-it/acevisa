import { KB_CATEGORIES } from '@/lib/admin/categories'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  const supabase = createAdminClient()
  const { data: entries, error: fetchError } = await supabase
    .from('knowledge_base')
    .select('id, category, topic, answer, is_active, added_at')
    .order('category')
    .order('topic')

  if (fetchError) {
    console.error('Knowledge base fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
  }

  return NextResponse.json({ entries: entries ?? [] })
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const body = await request.json()
  const { category, topic, answer, is_active } = body

  if (!category || !topic?.trim() || !answer?.trim()) {
    return NextResponse.json({ error: 'Category, topic, and answer are required' }, { status: 400 })
  }

  if (!KB_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: entry, error: insertError } = await supabase
    .from('knowledge_base')
    .insert({
      category,
      topic: topic.trim(),
      answer: answer.trim(),
      is_active: is_active !== false,
      added_by: admin.id,
    })
    .select('id, category, topic, answer, is_active, added_at')
    .single()

  if (insertError) {
    console.error('Knowledge base insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }

  return NextResponse.json({ entry })
}
