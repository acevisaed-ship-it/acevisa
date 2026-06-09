import { CAMPAIGN_SERVICES } from '@/lib/admin/categories'
import { parseCounselorName } from '@/lib/admin/parseCounselorJoin'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

function normalizeAdSourceCode(code: string) {
  return code.trim().toLowerCase().replace(/\s+/g, '_')
}

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.campaign_name !== undefined) updates.campaign_name = String(body.campaign_name).trim()
  if (body.ad_source_code !== undefined) {
    const code = normalizeAdSourceCode(body.ad_source_code)
    if (!/^[a-z0-9_]+$/.test(code)) {
      return NextResponse.json(
        { error: 'Ad source code must contain only lowercase letters, numbers, and underscores' },
        { status: 400 }
      )
    }
    updates.ad_source_code = code
  }
  if (body.opening_line !== undefined) updates.opening_line = String(body.opening_line).trim()
  if (body.context_hint !== undefined) updates.context_hint = body.context_hint?.trim() || null
  if (body.target_country !== undefined) updates.target_country = body.target_country?.trim() || null
  if (body.target_service !== undefined) {
    if (body.target_service && !CAMPAIGN_SERVICES.includes(body.target_service)) {
      return NextResponse.json({ error: 'Invalid target service' }, { status: 400 })
    }
    updates.target_service = body.target_service || null
  }
  if (body.default_counselor_id !== undefined) {
    updates.default_counselor_id = body.default_counselor_id || null
  }
  if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active)

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: campaign, error: updateError } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .select(
      'id, campaign_name, ad_source_code, opening_line, context_hint, target_country, target_service, default_counselor_id, is_active, created_at, counselors(name)'
    )
    .single()

  if (updateError) {
    console.error('Campaign update error:', updateError)
    if (updateError.code === '23505') {
      return NextResponse.json({ error: 'Ad source code already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
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
