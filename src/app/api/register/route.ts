import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { name, phone, city, language, ad_source } = body

  if (!name || !phone || !language) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: true, clientId: existing.id, existing: true })
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      name,
      phone,
      city: city || null,
      language: String(language).toLowerCase(),
      ad_source: ad_source || 'direct',
      pipeline_stage: 1,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, clientId: data.id })
}
