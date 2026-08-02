import { NextResponse } from 'next/server'
import { getAuthenticatedCounselor, createAdminClient } from '@/lib/supabase/server'
import { processDueScheduledEmails } from '@/lib/email/processScheduled'

export const runtime = 'nodejs'
export const maxDuration = 60

/** List pending scheduled emails for the current user, and flush any that are due. */
export async function GET() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Opportunistically send anything due for this counselor
  const flushed = await processDueScheduledEmails(counselor.id)

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('scheduled_emails')
    .select('id, to_addresses, cc_addresses, subject, send_at, status, created_at, error_message')
    .eq('counselor_id', counselor.id)
    .in('status', ['pending', 'failed'])
    .order('send_at', { ascending: true })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message, items: [], flushed }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [], flushed })
}

export async function DELETE(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('scheduled_emails')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('counselor_id', counselor.id)
    .eq('status', 'pending')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
