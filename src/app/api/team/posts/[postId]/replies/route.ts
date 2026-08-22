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

export async function GET(_: Request, { params }: { params: Promise<{ postId: string }> }) {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId } = await params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_post_replies')
    .select('id, author_id, author_name, content, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ replies: data ?? [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId } = await params
  const { content } = await request.json() as { content: string }
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_post_replies')
    .insert({ post_id: postId, author_id: identity.id, author_name: identity.name, content: content.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await notifyStaffExcept({
    exceptId: identity.id,
    type: 'team_message',
    title: 'New message in team chat',
    body: `${identity.name} replied to a post: ${data.content?.slice(0, 120) ?? ''}`,
  })

  return NextResponse.json({ reply: data })
}
