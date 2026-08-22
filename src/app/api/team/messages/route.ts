import { NextResponse } from 'next/server'
import { notifyTeamHubMessage } from '@/lib/notifications'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

async function getIdentity() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  // Try counselor
  const { data: counselor } = await admin.from('counselors').select('id, name').eq('email', user.email).single()
  if (counselor) return { id: counselor.id, name: counselor.name }
  return null
}

export async function GET(request: Request) {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const before = searchParams.get('before')

  const admin = createAdminClient()
  let query = admin
    .from('team_messages')
    .select('id, sender_id, sender_name, sender_initials, content, created_at, attachment_url, attachment_name, attachment_type')
    .order('created_at', { ascending: false })
    .limit(50)

  if (before) query = query.lt('created_at', before)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ messages: (data ?? []).reverse() })
}

export async function POST(request: Request) {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await request.json() as { content: string }
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const initials = identity.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_messages')
    .insert({ sender_id: identity.id, sender_name: identity.name, sender_initials: initials, content: content.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await notifyTeamHubMessage({
    senderId: identity.id,
    senderName: identity.name,
    preview: data.content,
  })

  return NextResponse.json({ message: data })
}
