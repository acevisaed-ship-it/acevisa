import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  const supabase = createAdminClient()
  const [{ data: documents, error: docsError }, { data: products }] = await Promise.all([
    supabase
      .from('terms_documents')
      .select(
        'id, scope, product_id, title, body, version, is_active, published_at, published_by, created_at'
      )
      .order('scope')
      .order('version', { ascending: false }),
    supabase.from('products').select('id, name').order('name'),
  ])

  if (docsError) {
    return NextResponse.json({ error: docsError.message }, { status: 500 })
  }

  return NextResponse.json({ documents: documents ?? [], products: products ?? [] })
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const body = await request.json()
  const scope = body.scope === 'product' ? 'product' : body.scope === 'general' ? 'general' : null
  if (!scope) {
    return NextResponse.json({ error: 'scope must be general or product' }, { status: 400 })
  }
  if (scope === 'product' && !body.product_id) {
    return NextResponse.json({ error: 'product_id is required for a product policy' }, { status: 400 })
  }
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const text = typeof body.body === 'string' ? body.body.trim() : ''
  if (!title || !text) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const productId = scope === 'product' ? body.product_id : null

  let versionQuery = supabase.from('terms_documents').select('version').eq('scope', scope)
  versionQuery = productId
    ? versionQuery.eq('product_id', productId)
    : versionQuery.is('product_id', null)
  const { data: latest } = await versionQuery.order('version', { ascending: false }).limit(1)

  const version = (latest?.[0]?.version ?? 0) + 1

  const { data, error: insertError } = await supabase
    .from('terms_documents')
    .insert({
      scope,
      product_id: productId,
      title,
      body: text,
      version,
      is_active: false,
    })
    .select(
      'id, scope, product_id, title, body, version, is_active, published_at, published_by, created_at'
    )
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ document: data, createdBy: admin.id })
}
