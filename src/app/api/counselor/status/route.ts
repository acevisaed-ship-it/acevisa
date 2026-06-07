import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { counselorId, isOnline, autoReplyEnabled } = await request.json()

  if (!counselorId || typeof isOnline !== 'boolean') {
    return NextResponse.json(
      { error: 'Missing counselorId or isOnline' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { error } = await supabase.from('counselor_status').upsert(
    {
      counselor_id: counselorId,
      is_online: isOnline,
      auto_reply_enabled: isOnline ? (autoReplyEnabled ?? false) : false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'counselor_id' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
