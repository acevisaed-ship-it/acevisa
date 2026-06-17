import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')

  if (!clientId) return NextResponse.json({ messages: [] })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('conversations')
    .select('id, message_text, sender, counselor_name, timestamp, attachment_url, attachment_name, attachment_type')
    .eq('client_id', clientId)
    .order('timestamp', { ascending: true })

  return NextResponse.json({ messages: data || [] })
}
