import { NextResponse } from 'next/server'
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

export async function GET() {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: posts, error } = await admin
    .from('team_posts')
    .select('id, author_id, author_name, title, content, pinned, created_at')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
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

  const { title, content, pinned } = await request.json() as { title: string; content: string; pinned?: boolean }
  if (!title?.trim() || !content?.trim()) return NextResponse.json({ error: 'title and content required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_posts')
    .insert({ author_id: identity.id, author_name: identity.name, title: title.trim(), content: content.trim(), pinned: pinned ?? false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}
