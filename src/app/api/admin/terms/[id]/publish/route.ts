import { logActivity } from '@/lib/activityLog'
import { requireCeoApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireCeoApi()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()
  const { data: doc } = await supabase
    .from('terms_documents')
    .select('id, scope, product_id, version, is_active, published_at')
    .eq('id', id)
    .maybeSingle()

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  let clientsAffected = 0
  if (doc.scope === 'product' && doc.product_id) {
    const { data: current } = await supabase
      .from('terms_documents')
      .select('id')
      .eq('scope', 'product')
      .eq('product_id', doc.product_id)
      .eq('is_active', true)
      .maybeSingle()

    if (current?.id) {
      const { count } = await supabase
        .from('invoice_consents')
        .select('client_id', { count: 'exact', head: true })
        .eq('product_id', doc.product_id)
        .eq('status', 'agreed')
        .eq('product_terms_id', current.id)
      clientsAffected = count ?? 0
    }
  } else if (doc.scope === 'general') {
    const { data: current } = await supabase
      .from('terms_documents')
      .select('id')
      .eq('scope', 'general')
      .eq('is_active', true)
      .maybeSingle()
    if (current?.id) {
      const { count } = await supabase
        .from('invoice_consents')
        .select('client_id', { count: 'exact', head: true })
        .eq('status', 'agreed')
        .eq('general_terms_id', current.id)
      clientsAffected = count ?? 0
    }
  }

  return NextResponse.json({ clientsAffected, alreadyPublished: !!doc.published_at })
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, error } = await requireCeoApi()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()
  const { data: doc } = await supabase
    .from('terms_documents')
    .select('id, scope, product_id, title, version, published_at, is_active')
    .eq('id', id)
    .maybeSingle()

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }
  if (doc.is_active && doc.published_at) {
    return NextResponse.json({ error: 'This version is already published' }, { status: 400 })
  }

  const deactivate = supabase.from('terms_documents').update({ is_active: false }).eq('scope', doc.scope)
  const { error: deactivateError } = doc.product_id
    ? await deactivate.eq('product_id', doc.product_id).neq('id', id)
    : await deactivate.is('product_id', null).neq('id', id)

  if (deactivateError) {
    return NextResponse.json({ error: deactivateError.message }, { status: 500 })
  }

  const { data: published, error: publishError } = await supabase
    .from('terms_documents')
    .update({
      is_active: true,
      published_at: new Date().toISOString(),
      published_by: admin.id,
    })
    .eq('id', id)
    .select(
      'id, scope, product_id, title, body, version, is_active, published_at, published_by, created_at'
    )
    .single()

  if (publishError) {
    return NextResponse.json({ error: publishError.message }, { status: 500 })
  }

  await logActivity({
    counselorId: admin.id,
    actorRole: admin.role,
    actionType: 'terms_published',
    description: `${admin.name} published ${doc.title} v${doc.version}`,
    metadata: { entity: 'terms_document', entityId: id, scope: doc.scope, version: doc.version },
  })

  return NextResponse.json({ document: published })
}
