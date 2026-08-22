import { NextResponse } from 'next/server'
import { notifyTeamHubMessage } from '@/lib/notifications'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

async function getIdentity() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: counselor } = await admin.from('counselors').select('id, name').eq('email', user.email).single()
  return counselor ? { id: counselor.id, name: counselor.name } : null
}

type RouteParams = { params: Promise<{ peerId: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { peerId } = await params

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('direct_messages')
    .select('id, sender_id, sender_name, recipient_id, content, created_at, attachment_url, attachment_name, attachment_type')
    .or(`and(sender_id.eq.${identity.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${identity.id})`)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', peerId)
    .eq('recipient_id', identity.id)
    .is('read_at', null)

  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(request: Request, { params }: RouteParams) {
  const identity = await getIdentity()
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { peerId } = await params

  const { content } = await request.json() as { content: string }
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('direct_messages')
    .insert({
      sender_id: identity.id,
      sender_name: identity.name,
      recipient_id: peerId,
      content: content.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await notifyTeamHubMessage({
    senderId: identity.id,
    senderName: identity.name,
    preview: data.content,
    recipientId: peerId,
  })

  return NextResponse.json({ message: data })
}
