import { NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

// Total unread direct-message count for the current staff member, for the
// Team Hub sidebar badge. Team Hub's group chat and bulletin board have no
// per-user read tracking (see team_messages/team_posts schema), so DMs —
// the one place read state is actually tracked (direct_messages.read_at) —
// are what "unread" means here, same as the per-sender breakdown already
// used inside Team Hub's DM list (/api/team/dm/unread).
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('counselors').select('id').eq('email', user.email).single()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { count } = await admin
    .from('direct_messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', me.id)
    .is('read_at', null)

  return NextResponse.json({ count: count ?? 0 })
}
