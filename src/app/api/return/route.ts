import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { phone } = await request.json()

  if (!phone) {
    return NextResponse.json({ error: 'Phone required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', phone.trim())
    .single()

  if (!client) {
    return NextResponse.json({ error: 'No account found' }, { status: 404 })
  }

  return NextResponse.json({ clientId: client.id })
}
