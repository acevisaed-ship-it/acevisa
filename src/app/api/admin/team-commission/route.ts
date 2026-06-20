import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('team_commission_policy')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ policy: data ?? null })
}

export async function POST(req: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const body = await req.json()
  const {
    referral_enabled,
    referral_rate,
    pool_enabled,
    pool_rate,
    pool_distribution,
    notes,
  } = body

  const supabase = createAdminClient()

  // Always update the single existing row (or insert if somehow missing)
  const { data: existing } = await supabase
    .from('team_commission_policy')
    .select('id')
    .limit(1)
    .maybeSingle()

  const payload = {
    referral_enabled: Boolean(referral_enabled),
    referral_rate: Number(referral_rate ?? 5),
    pool_enabled: Boolean(pool_enabled),
    pool_rate: Number(pool_rate ?? 5),
    pool_distribution: pool_distribution === 'performance' ? 'performance' : 'equal',
    notes: notes?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { error: updateErr } = await supabase
      .from('team_commission_policy')
      .update(payload)
      .eq('id', existing.id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  } else {
    const { error: insertErr } = await supabase
      .from('team_commission_policy')
      .insert(payload)
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
