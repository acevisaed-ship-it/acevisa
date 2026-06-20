import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ updates: [] })

  const supabase = createAdminClient()

  const { data } = await supabase
    .from('activity_logs')
    .select('id, action_type, description, created_at, counselor_id, metadata')
    .eq('client_id', clientId)
    .eq('visibility', 'shared')
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ updates: data ?? [] })
}
