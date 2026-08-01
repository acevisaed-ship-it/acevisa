import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ applications: [] })

  const supabase = createAdminClient()
  const { data: applications } = await supabase
    .from('applications')
    .select('id, institution_name, program_name, country, status, submitted_date, decision_date, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  const ids = (applications ?? []).map((a) => a.id)
  const { data: updates } = ids.length
    ? await supabase
        .from('application_updates')
        .select('id, application_id, status, note, created_at')
        .in('application_id', ids)
        .eq('visibility', 'shared')
        .order('created_at', { ascending: true })
    : { data: [] }

  const withUpdates = (applications ?? []).map((app) => ({
    ...app,
    updates: (updates ?? []).filter((u) => u.application_id === app.id),
  }))

  return NextResponse.json({ applications: withUpdates })
}
