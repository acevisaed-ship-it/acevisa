import { NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('counselors').select('id').eq('email', user.email).single()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: unread } = await admin
    .from('direct_messages')
    .select('sender_id')
    .eq('recipient_id', me.id)
    .is('read_at', null)

  const counts: Record<string, number> = {}
  for (const row of unread ?? []) counts[row.sender_id] = (counts[row.sender_id] ?? 0) + 1

  return NextResponse.json({ counts })
}
