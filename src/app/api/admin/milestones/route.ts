import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { writeAudit } from '@/lib/ledger/audit'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MILESTONE_TYPES = ['offer_letter', 'loa_cas', 'visa_filed', 'visa_granted', 'other'] as const
type MilestoneType = (typeof MILESTONE_TYPES)[number]

function isMilestoneType(v: string): v is MilestoneType {
  return (MILESTONE_TYPES as readonly string[]).includes(v)
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const body = (await request.json()) as {
    dealId?: string
    type?: string
    occurredAt?: string
    applicationId?: string | null
  }

  const dealId = body.dealId?.trim()
  const type = body.type?.trim() ?? ''
  if (!dealId || !isMilestoneType(type)) {
    return NextResponse.json({ error: 'dealId and a valid milestone type are required' }, { status: 400 })
  }

  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date()
  if (Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: 'Invalid occurredAt' }, { status: 400 })
  }
  const occurredIso = occurredAt.toISOString()

  const supabase = createAdminClient()
  const { data: deal } = await supabase
    .from('deals')
    .select('id, client_id, counselor_id')
    .eq('id', dealId)
    .single()
  if (!deal || !deal.client_id) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  if (isBranchScopedAdmin(admin)) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('branch_id')
      .eq('id', deal.client_id)
      .single()
    if (!clientRow || clientRow.branch_id !== admin.branch_id) {
      return NextResponse.json({ error: 'Deal not in your branch' }, { status: 403 })
    }
  }

  const { data: assignment } = await supabase
    .from('client_assignments')
    .select('counselor_id')
    .eq('client_id', deal.client_id)
    .lte('assigned_at', occurredIso)
    .or(`ended_at.is.null,ended_at.gt.${occurredIso}`)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const holderId = assignment?.counselor_id ?? deal.counselor_id ?? null

  const { data: invoiceForProduct } = await supabase
    .from('invoices')
    .select('product_id')
    .eq('deal_id', dealId)
    .not('product_id', 'is', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: milestone, error: insertError } = await supabase
    .from('milestones')
    .insert({
      deal_id: dealId,
      client_id: deal.client_id,
      application_id: body.applicationId || null,
      product_id: invoiceForProduct?.product_id ?? null,
      type,
      occurred_at: occurredIso,
      holder_counselor_id: holderId,
      recorded_by: admin.id,
    })
    .select()
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'This milestone is already recorded for the deal' }, { status: 409 })
    }
    console.error('Milestone insert error:', insertError)
    return NextResponse.json({ error: 'Failed to record milestone' }, { status: 500 })
  }

  const audit = await writeAudit({
    actorId: admin.id,
    actorRole: admin.role,
    branchId: admin.branch_id,
    entityType: 'milestone',
    entityId: milestone.id,
    action: 'created',
    after: milestone,
  })
  if (audit.error) {
    return NextResponse.json({ error: 'Milestone saved but audit failed' }, { status: 500 })
  }

  return NextResponse.json({ milestone })
}
