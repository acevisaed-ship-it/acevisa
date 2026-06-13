import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { clientId } = await request.json() as { clientId?: string }
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  const supabase = createAdminClient()
  await supabase
    .from('clients')
    .update({ portal_password_set: true })
    .eq('id', clientId)

  return NextResponse.json({ success: true })
}
