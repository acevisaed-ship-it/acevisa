import {
  DEAL_SERVICE_TYPES,
  DEAL_STAGES,
  type DealStage,
} from '@/lib/admin/dealTypes'
import { parseClientJoin, parseCounselorName } from '@/lib/admin/parseCounselorJoin'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function mapDeal(row: Record<string, unknown>) {
  const client = parseClientJoin(
    row.clients as { name: string; id: string } | { name: string; id: string }[] | null
  )
  const product = row.products as { name: string } | null
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    counselor_id: row.counselor_id as string | null,
    service_type: row.service_type as string,
    target_country: row.target_country as string | null,
    deal_value: Number(row.deal_value),
    currency: row.currency as string,
    stage: row.stage as string,
    stage_notes: row.stage_notes as string | null,
    signed_at: row.signed_at as string | null,
    expected_close_date: row.expected_close_date as string | null,
    actual_close_date: row.actual_close_date as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    client_name: client?.name ?? null,
    counselor_name: parseCounselorName(
      row.counselors as { name: string } | { name: string }[] | null
    ),
    product_id: row.product_id as string | null,
    product_name: product?.name ?? null,
  }
}

export async function GET(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const counselorId = searchParams.get('counselor_id')
  const serviceType = searchParams.get('service_type')
  const month = searchParams.get('month')

  const supabase = createAdminClient()
  let query = supabase
    .from('deals')
    .select(
      'id, client_id, counselor_id, product_id, service_type, target_country, deal_value, currency, stage, stage_notes, signed_at, expected_close_date, actual_close_date, created_at, updated_at, clients(name, id), counselors(name), products(name)'
    )
    .order('created_at', { ascending: false })

  if (counselorId) query = query.eq('counselor_id', counselorId)
  if (serviceType) query = query.eq('service_type', serviceType)
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, mon] = month.split('-').map(Number)
    const start = new Date(Date.UTC(year, mon - 1, 1)).toISOString()
    const end = new Date(Date.UTC(year, mon, 1)).toISOString()
    query = query.gte('created_at', start).lt('created_at', end)
  }

  const { data, error: fetchError } = await query

  if (fetchError) {
    console.error('Deals fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
  }

  return NextResponse.json({ deals: (data ?? []).map(mapDeal) })
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const body = await request.json()
  const {
    client_id,
    counselor_id,
    service_type,
    target_country,
    deal_value,
    stage,
    stage_notes,
    expected_close_date,
    product_id,
  } = body

  if (!client_id) {
    return NextResponse.json({ error: 'Client is required' }, { status: 400 })
  }
  if (!service_type || !DEAL_SERVICE_TYPES.includes(service_type)) {
    return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
  }
  if (stage && !DEAL_STAGES.includes(stage)) {
    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error: insertError } = await supabase
    .from('deals')
    .insert({
      client_id,
      counselor_id: counselor_id || null,
      product_id: product_id || null,
      service_type,
      target_country: target_country?.trim() || null,
      deal_value: Number(deal_value) || 0,
      stage: (stage as DealStage) || 'lead',
      stage_notes: stage_notes?.trim() || null,
      expected_close_date: expected_close_date || null,
    })
    .select(
      'id, client_id, counselor_id, product_id, service_type, target_country, deal_value, currency, stage, stage_notes, signed_at, expected_close_date, actual_close_date, created_at, updated_at, clients(name, id), counselors(name), products(name)'
    )
    .single()

  if (insertError) {
    console.error('Deal insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
  }

  return NextResponse.json({ deal: mapDeal(data) })
}
