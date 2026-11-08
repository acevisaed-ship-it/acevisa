import { requireAccountsApi } from '@/lib/admin/requireAccountsApi'
import { QUERY_VIEWS } from '@/lib/ledger/queryViews'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/** Saved report views: starter views and shared views are visible to every admin; others only to their owner. */
export async function GET() {
  const { admin, error } = await requireAccountsApi('full')
  if (error) return error
  const supabase = createAdminClient()
  const { data, error: qError } = await supabase
    .from('saved_views')
    .select('id, owner_id, name, config, shared')
    .or(`owner_id.is.null,shared.eq.true,owner_id.eq.${admin.id}`)
    .order('created_at', { ascending: true })
  if (qError) {
    console.error('[saved-views] list failed:', qError)
    return NextResponse.json({ views: [] })
  }
  const views = (data ?? []).map((v) => ({
    id: v.id, name: v.name, config: v.config, shared: v.shared,
    starter: v.owner_id == null, mine: v.owner_id === admin.id,
  }))
  return NextResponse.json({ views })
}

export async function POST(request: Request) {
  const { admin, error } = await requireAccountsApi('full')
  if (error) return error
  const body = (await request.json().catch(() => ({}))) as { name?: string; config?: { view?: string }; shared?: boolean }
  const name = (body.name ?? '').trim().slice(0, 80)
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!body.config || typeof body.config !== 'object' || !body.config.view || !QUERY_VIEWS[body.config.view]) {
    return NextResponse.json({ error: 'Invalid view' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { data, error: iError } = await supabase
    .from('saved_views')
    .insert({ owner_id: admin.id, name, config: body.config, shared: body.shared === true })
    .select('id')
    .single()
  if (iError) {
    console.error('[saved-views] insert failed:', iError)
    return NextResponse.json({ error: 'Could not save view' }, { status: 500 })
  }
  return NextResponse.json({ id: data.id })
}

export async function DELETE(request: Request) {
  const { admin, error } = await requireAccountsApi('full')
  if (error) return error
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const supabase = createAdminClient()
  const { error: dError } = await supabase.from('saved_views').delete().eq('id', id).eq('owner_id', admin.id)
  if (dError) {
    console.error('[saved-views] delete failed:', dError)
    return NextResponse.json({ error: 'Could not delete view' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
