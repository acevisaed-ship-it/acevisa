import { NextResponse } from 'next/server'
import { notifyStaffExcept } from '@/lib/notifications'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

async function getIdentity() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: counselor } = await admin.from('counselors').select('id, name').eq('email', user.email).single()
  if (counselor) return { id: counselor.id, name: counselor.name }
  return null
}

export async function GET(request: Request) {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const board = searchParams.get('board') || 'bulletin'

  const admin = createAdminClient()
  const { data: posts, error } = await admin
    .from('team_posts')
    .select('id, author_id, author_name, title, content, pinned, board, due_date, created_at')
    .eq('board', board)
    .order('pinned', { ascending: false })
    .order(board === 'deadlines' ? 'due_date' : 'created_at', { ascending: board === 'deadlines' })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get reply counts
  const postIds = (posts ?? []).map((p) => p.id)
  const { data: replies } = await admin
    .from('team_post_replies')
    .select('post_id')
    .in('post_id', postIds.length ? postIds : ['none'])

  const replyCounts: Record<string, number> = {}
  for (const r of replies ?? []) {
    replyCounts[r.post_id] = (replyCounts[r.post_id] ?? 0) + 1
  }

  const enriched = (posts ?? []).map((p) => ({ ...p, replyCount: replyCounts[p.id] ?? 0 }))
  return NextResponse.json({ posts: enriched })
}

export async function POST(request: Request) {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, content, pinned, board, due_date } = await request.json() as {
    title: string; content: string; pinned?: boolean; board?: string; due_date?: string
  }
  if (!title?.trim() || !content?.trim()) return NextResponse.json({ error: 'title and content required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_posts')
    .insert({
      author_id: identity.id,
      author_name: identity.name,
      title: title.trim(),
      content: content.trim(),
      pinned: pinned ?? false,
      board: board || 'bulletin',
      due_date: due_date || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await notifyStaffExcept({
    exceptId: identity.id,
    type: 'team_message',
    title: 'New message in team chat',
    body: `${identity.name} posted: ${data.title}`,
  })

  return NextResponse.json({ post: data })
}
