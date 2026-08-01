import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { CAMPAIGN_SERVICES } from '@/lib/admin/categories'
import { parseCounselorName } from '@/lib/admin/parseCounselorJoin'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function normalizeAdSourceCode(code: string) {
  return code.trim().toLowerCase().replace(/\s+/g, '_')
}

export async function GET() {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const branchScoped = isBranchScopedAdmin(admin)
  const supabase = createAdminClient()
  let query = supabase
    .from('campaigns')
    .select(
      'id, campaign_name, ad_source_code, opening_line, context_hint, target_country, target_service, default_counselor_id, is_active, created_at, branch_id, counselors(name)'
    )
    .order('created_at', { ascending: false })

  if (branchScoped) {
    query = query.eq('branch_id', admin.branch_id)
  }

  const { data: campaigns, error: fetchError } = await query

  if (fetchError) {
    console.error('Campaigns fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }

  const rows = (campaigns ?? []).map((c) => {
    const counselorName = parseCounselorName(
      c.counselors as { name: string } | { name: string }[] | null
    )
    return {
      id: c.id,
      campaign_name: c.campaign_name,
      ad_source_code: c.ad_source_code,
      opening_line: c.opening_line,
      context_hint: c.context_hint,
      target_country: c.target_country,
      target_service: c.target_service,
      default_counselor_id: c.default_counselor_id,
      counselor_name: counselorName,
      is_active: c.is_active,
      created_at: c.created_at,
    }
  })

  return NextResponse.json({ campaigns: rows })
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const body = await request.json()
  const {
    campaign_name,
    ad_source_code,
    opening_line,
    context_hint,
    target_country,
    target_service,
    default_counselor_id,
    is_active,
  } = body

  if (!campaign_name?.trim() || !ad_source_code?.trim() || !opening_line?.trim()) {
    return NextResponse.json(
      { error: 'Campaign name, ad source code, and opening line are required' },
      { status: 400 }
    )
  }

  const code = normalizeAdSourceCode(ad_source_code)
  if (!/^[a-z0-9_]+$/.test(code)) {
    return NextResponse.json(
      { error: 'Ad source code must contain only lowercase letters, numbers, and underscores' },
      { status: 400 }
    )
  }

  if (target_service && !CAMPAIGN_SERVICES.includes(target_service)) {
    return NextResponse.json({ error: 'Invalid target service' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const branchId = isBranchScopedAdmin(admin) ? admin.branch_id : body.branch_id || null

  const { data: campaign, error: insertError } = await supabase
    .from('campaigns')
    .insert({
      campaign_name: campaign_name.trim(),
      ad_source_code: code,
      opening_line: opening_line.trim(),
      context_hint: context_hint?.trim() || null,
      target_country: target_country?.trim() || null,
      target_service: target_service || null,
      default_counselor_id: default_counselor_id || null,
      branch_id: branchId,
      is_active: is_active !== false,
    })
    .select(
      'id, campaign_name, ad_source_code, opening_line, context_hint, target_country, target_service, default_counselor_id, is_active, created_at, counselors(name)'
    )
    .single()

  if (insertError) {
    console.error('Campaign insert error:', insertError)
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Ad source code already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }

  return NextResponse.json({
    campaign: {
      ...campaign,
      counselors: undefined,
      counselor_name: parseCounselorName(
        campaign.counselors as { name: string } | { name: string }[] | null
      ),
    },
  })
}
