import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  const supabase = createAdminClient()
  const { data, error: fetchError } = await supabase
    .from('portal_settings')
    .select('key, value')

  if (fetchError) return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })

  const settings: Record<string, unknown> = {}
  for (const row of data ?? []) {
    settings[row.key] = row.value
  }

  return NextResponse.json({ settings })
}

export async function PATCH(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { key, value } = await request.json()
  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key and value required' }, { status: 400 })
  }

  const allowed = ['notifications', 'security', 'appearance', 'office_location']
  if (!allowed.includes(key)) {
    return NextResponse.json({ error: 'Invalid settings key' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error: upsertError } = await supabase
    .from('portal_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (upsertError) return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  return NextResponse.json({ success: true })
}
