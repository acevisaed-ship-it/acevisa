import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

  const supabase = createAdminClient()

  const [clientRes, meetingsRes, docsRes, profileRes] = await Promise.all([
    supabase
      .from('clients')
      .select('name, phone, email, city, pipeline_stage, counselor_id, target_country, interested_in')
      .eq('id', clientId)
      .single(),
    supabase
      .from('meetings')
      .select('id, scheduled_time, status, counselor_id')
      .eq('client_id', clientId)
      .order('scheduled_time', { ascending: false })
      .limit(10),
    supabase
      .from('documents')
      .select('id, document_name, status, file_url, updated_at')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })
      .limit(8),
    supabase
      .from('ai_profiles')
      .select('profile_json, generated_at')
      .eq('client_id', clientId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const client = clientRes.data
  let counselorName: string | null = null

  if (client?.counselor_id) {
    const { data: counselor } = await supabase
      .from('counselors')
      .select('name')
      .eq('id', client.counselor_id)
      .single()
    counselorName = counselor?.name ?? null
  }

  return NextResponse.json({
    client: client ?? null,
    counselorName,
    meetings: meetingsRes.data ?? [],
    documents: docsRes.data ?? [],
    aiProfile: profileRes.data?.profile_json ?? null,
  })
}
