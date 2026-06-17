import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/counselor/active  { clientId, active: true | false }
export async function POST(request: Request) {
  const { clientId, active } = await request.json()
  if (!clientId || typeof active !== 'boolean') {
    return NextResponse.json({ error: 'Missing clientId or active flag' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clients')
    .update({ counselor_active: active })
    .eq('id', clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
