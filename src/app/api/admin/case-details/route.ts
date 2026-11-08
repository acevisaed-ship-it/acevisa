import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { requireAccountsApi } from '@/lib/admin/requireAccountsApi'
import { writeAudit } from '@/lib/ledger/audit'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const SOURCES = ['agent', 'counselor_referral', 'walk_in', 'campaign', 'direct', 'other']

type Body = {
  dealId?: string
  countryId?: string | null
  universityId?: string | null
  institutionOther?: string | null
  agentId?: string | null
  sourceType?: string | null
  appliedAt?: string | null
}

/** Sets the reporting fields on a case (country, institution, agent, source, application date). Audited. */
export async function POST(request: Request) {
  const { admin, error } = await requireAccountsApi('full')
  if (error) return error
  const body = (await request.json().catch(() => ({}))) as Body
  if (!body.dealId) return NextResponse.json({ error: 'dealId is required' }, { status: 400 })
  if (body.sourceType && !SOURCES.includes(body.sourceType)) return NextResponse.json({ error: 'Invalid source type' }, { status: 400 })
  if (body.appliedAt && !/^\d{4}-\d{2}-\d{2}$/.test(body.appliedAt)) return NextResponse.json({ error: 'Application date must be YYYY-MM-DD' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: deal } = await supabase
    .from('deals')
    .select('id, client_id, country_id, university_id, agent_id, source_type, applied_at, institution_other, clients(branch_id)')
    .eq('id', body.dealId)
    .maybeSingle()
  if (!deal) return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  const clientBranch = (deal.clients as unknown as { branch_id: string | null } | null)?.branch_id ?? null
  if (isBranchScopedAdmin(admin) && clientBranch !== admin.branch_id) {
    return NextResponse.json({ error: 'Case not in your branch' }, { status: 403 })
  }

  // Partner status is frozen on the case at the time the institution is chosen
  let partner: boolean | null = null
  if (body.universityId) {
    const { data: uni } = await supabase.from('universities').select('is_partner').eq('id', body.universityId).maybeSingle()
    partner = uni?.is_partner ?? false
  }

  const patch = {
    country_id: body.countryId || null,
    university_id: body.universityId || null,
    institution_other: body.universityId ? null : (body.institutionOther?.trim() || null),
    agent_id: body.agentId || null,
    source_type: body.sourceType || null,
    applied_at: body.appliedAt || null,
    partner_at_application: partner,
  }
  const { error: uError } = await supabase.from('deals').update(patch).eq('id', deal.id)
  if (uError) {
    console.error('[case-details] update failed:', uError)
    return NextResponse.json({ error: 'Could not update case' }, { status: 500 })
  }
  await writeAudit({
    actorId: admin.id, actorRole: admin.role, branchId: clientBranch, entityType: 'deal', entityId: deal.id, action: 'case_details_updated',
    before: { country_id: deal.country_id, university_id: deal.university_id, agent_id: deal.agent_id, source_type: deal.source_type, applied_at: deal.applied_at, institution_other: deal.institution_other },
    after: patch,
  })
  return NextResponse.json({ ok: true })
}
