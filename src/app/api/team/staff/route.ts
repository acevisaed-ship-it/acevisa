import { NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('counselors').select('id').eq('email', user.email).single()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: staff } = await admin
    .from('counselors')
    .select('id, name, role')
    .in('role', ['counselor', 'admin', 'ceo'])
    .eq('status', 'active')
    .neq('id', me.id)
    .order('name')

  return NextResponse.json({ staff: staff ?? [] })
}
