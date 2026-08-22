import { NextResponse } from 'next/server'
import { createNotification } from '@/lib/notifications'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    uid?: number
    subject?: string
    from?: string
  }
  const uid = Number(body.uid)
  if (!uid) {
    return NextResponse.json({ error: 'uid required' }, { status: 400 })
  }

  const marker = `#uid:${uid}`
  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('counselor_id', counselor.id)
    .eq('type', 'email_update')
    .ilike('body', `%${marker}%`)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ success: true, duplicate: true })
  }

  const from = body.from?.trim() || 'Unknown sender'
  const subject = body.subject?.trim() || '(no subject)'
  await createNotification({
    counselorId: counselor.id,
    type: 'email_update',
    title: 'You received a new email',
    body: `${from}: ${subject} ${marker}`,
  })

  return NextResponse.json({ success: true })
}
