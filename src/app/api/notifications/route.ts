import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const counselorId = searchParams.get('counselorId')
  if (!counselorId) return NextResponse.json({ error: 'Missing counselorId' }, { status: 400 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('counselor_id', counselorId)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ notifications: data || [] })
}

export async function PATCH(request: Request) {
  const { notificationId, counselorId, markAllRead } = await request.json()
  const supabase = createAdminClient()

  if (markAllRead && counselorId) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('counselor_id', counselorId)
      .eq('is_read', false)
  } else if (notificationId) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
  }

  return NextResponse.json({ success: true })
}
