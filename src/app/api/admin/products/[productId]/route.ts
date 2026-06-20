import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ productId: string }> }

export async function PUT(req: Request, { params }: Params) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { productId } = await params
  const body = await req.json()
  const { category, country, name, description, base_price, currency, is_active, sort_order } = body

  const supabase = createAdminClient()
  const { error: err } = await supabase
    .from('products')
    .update({
      category,
      country: country?.trim() || null,
      name: name.trim(),
      description: description?.trim() || null,
      base_price: Number(base_price ?? 0),
      currency: currency ?? 'PKR',
      is_active: is_active !== false,
      sort_order: Number(sort_order ?? 0),
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)

  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: Params) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { productId } = await params
  const supabase = createAdminClient()
  const { error: err } = await supabase.from('products').delete().eq('id', productId)
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
