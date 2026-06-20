import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  const supabase = createAdminClient()

  const { data: products, error: err } = await supabase
    .from('products')
    .select(`
      id, category, country, name, description, base_price, currency, is_active, sort_order,
      product_payment_stages ( id, stage_order, stage_name, amount_type, amount, percentage, due_trigger, notes ),
      product_vendors ( id, vendor_name, vendor_type, amount_type, amount, percentage, currency, notes ),
      product_commission_rules ( id, counselor_id, role, commission_type, commission_value, applies_to_stage, notes )
    `)
    .order('category')
    .order('sort_order')

  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({ products: products ?? [] })
}

export async function POST(req: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const body = await req.json()
  const { category, country, name, description, base_price, currency, is_active, sort_order } = body

  if (!category || !name) {
    return NextResponse.json({ error: 'category and name are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error: err } = await supabase
    .from('products')
    .insert({
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
    .select('id')
    .single()

  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
