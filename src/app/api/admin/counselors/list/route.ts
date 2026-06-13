import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { error: authError } = await requireAdminApi()
  if (authError) return authError

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('counselors')
    .select('id, name, email, phone, status, role, created_at')
    .order('created_at', { ascending: false })

  return NextResponse.json({ counselors: data || [] })
}
