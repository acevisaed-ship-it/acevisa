import { parseCounselorName } from '@/lib/admin/parseCounselorJoin'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(_request: Request, { params }: Params) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('campaigns')
    .select('is_active')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const { data: campaign, error: updateError } = await supabase
    .from('campaigns')
    .update({ is_active: !existing.is_active })
    .eq('id', id)
    .select(
      'id, campaign_name, ad_source_code, opening_line, context_hint, target_country, target_service, default_counselor_id, is_active, created_at, counselors(name)'
    )
    .single()

  if (updateError) {
    console.error('Campaign toggle error:', updateError)
    return NextResponse.json({ error: 'Failed to toggle campaign' }, { status: 500 })
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
