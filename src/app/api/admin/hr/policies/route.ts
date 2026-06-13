import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/admin/hr/policies?type=attendance
export async function GET(request: Request) {
  const { error: authError } = await requireAdminApi()
  if (authError) return authError

  const sp = new URL(request.url).searchParams
  const type = sp.get('type')

  const supabase = createAdminClient()

  let query = supabase
    .from('hr_policies')
    .select('id, policy_type, title, content, version, is_active, created_at, updated_at')
    .order('updated_at', { ascending: false })

  if (type) query = query.eq('policy_type', type)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ policies: data ?? [] })
}

// POST /api/admin/hr/policies — create a policy
export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi()
  if (authError) return authError

  const body = await request.json()
  const { policyType, title, content } = body

  if (!policyType || !title || !content) {
    return NextResponse.json({ error: 'policyType, title, content required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('hr_policies')
    .insert({ policy_type: policyType, title, content })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ policy: data })
}
