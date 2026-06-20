import { DEAL_SERVICE_TYPES, DEAL_STAGES, type DealStage } from '@/lib/admin/dealTypes'
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { dealId } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.stage !== undefined) {
    if (!DEAL_STAGES.includes(body.stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }
    updates.stage = body.stage as DealStage
    if (body.stage === 'agreement_signed' && !body.signed_at) {
      updates.signed_at = new Date().toISOString()
    }
    if (body.stage === 'completed') {
      updates.actual_close_date = body.actual_close_date || new Date().toISOString().slice(0, 10)
    }
  }

  if (body.service_type !== undefined) {
    if (!DEAL_SERVICE_TYPES.includes(body.service_type)) {
      return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
    }
    updates.service_type = body.service_type
  }

  if (body.counselor_id !== undefined) updates.counselor_id = body.counselor_id || null
  if (body.target_country !== undefined) updates.target_country = body.target_country?.trim() || null
  if (body.deal_value !== undefined) updates.deal_value = Number(body.deal_value) || 0
  if (body.stage_notes !== undefined) updates.stage_notes = body.stage_notes?.trim() || null
  if (body.expected_close_date !== undefined) {
    updates.expected_close_date = body.expected_close_date || null
  }
  if (body.signed_at !== undefined) updates.signed_at = body.signed_at || null
  if (body.actual_close_date !== undefined) {
    updates.actual_close_date = body.actual_close_date || null
  }
  if (body.product_id !== undefined) updates.product_id = body.product_id || null

  const supabase = createAdminClient()
  const { data, error: updateError } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', dealId)
    .select(
      'id, client_id, counselor_id, product_id, service_type, target_country, deal_value, currency, stage, stage_notes, signed_at, expected_close_date, actual_close_date, created_at, updated_at, clients(name, id), counselors(name), products(name)'
    )
    .single()

  if (updateError) {
    console.error('Deal update error:', updateError)
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
  }

  return NextResponse.json({ deal: mapDeal(data) })
}
