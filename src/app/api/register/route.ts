import { createNotification } from '@/lib/notifications'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { name, phone, city, language, ad_source } = body

  if (!name || !phone || !language) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const adSource = ad_source || 'direct'

  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: true, clientId: existing.id, existing: true })
  }

  let assignedCounselorId: string | null = null

  if (adSource && adSource !== 'direct') {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('default_counselor_id')
      .eq('ad_source_code', adSource)
      .eq('is_active', true)
      .maybeSingle()

    if (campaign?.default_counselor_id) {
      assignedCounselorId = campaign.default_counselor_id
    }
  }

  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({
      name,
      phone,
      city: city || null,
      language: String(language).toLowerCase(),
      ad_source: adSource,
      counselor_id: assignedCounselorId,
      pipeline_stage: 1,
      qualification_score: 0,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }

  if (!assignedCounselorId) {
    const { data: admins } = await supabase
      .from('counselors')
      .select('id')
      .eq('role', 'admin')

    for (const admin of admins || []) {
      await createNotification({
        counselorId: admin.id,
        type: 'chat_message',
        title: `New unassigned registration — ${name}`,
        body: `From: ${adSource}. Assign to a counselor.`,
        clientId: newClient.id,
      })
    }
  }

  return NextResponse.json({ success: true, clientId: newClient.id })
}
