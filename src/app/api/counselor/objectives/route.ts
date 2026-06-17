import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/counselor/objectives?clientId=X
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ objectives: [] })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('counselor_objectives')
    .select('id, objective_text, plan_text, status, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ objectives: data ?? [] })
}

// POST /api/counselor/objectives  { clientId, objectiveText, planText }
export async function POST(request: Request) {
  const { clientId, objectiveText, planText } = await request.json()
  if (!clientId || !objectiveText?.trim()) {
    return NextResponse.json({ error: 'Missing clientId or objectiveText' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('counselor_objectives')
    .insert({ client_id: clientId, objective_text: objectiveText.trim(), plan_text: planText ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ objective: data })
}
