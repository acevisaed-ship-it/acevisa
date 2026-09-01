import { requireCeoApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET/PATCH the CEO Agent's ON/OFF switch (Idea #1's explicit toggle
// requirement). CEO-only. When off, the daily review cron exits immediately
// without evaluating any playbook rule.
export async function GET() {
  const { error } = await requireCeoApi()
  if (error) return error

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('agent_settings')
    .select('enabled, updated_at')
    .eq('id', 'ceo_agent')
    .maybeSingle()

  return NextResponse.json({ enabled: data?.enabled ?? false, updatedAt: data?.updated_at ?? null })
}

export async function PATCH(request: Request) {
  const { admin, error } = await requireCeoApi()
  if (error) return error

  const { enabled } = (await request.json()) as { enabled?: boolean }
  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error: upsertError } = await supabase
    .from('agent_settings')
    .upsert({ id: 'ceo_agent', enabled, updated_at: new Date().toISOString(), updated_by: admin.id })

  if (upsertError) {
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
  }

  return NextResponse.json({ success: true, enabled })
}
