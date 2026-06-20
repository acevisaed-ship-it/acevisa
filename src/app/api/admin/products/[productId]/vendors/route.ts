import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ productId: string }> }

export async function POST(req: Request, { params }: Params) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { productId } = await params
  const { vendors } = await req.json()

  if (!Array.isArray(vendors)) {
    return NextResponse.json({ error: 'vendors array required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  await supabase.from('product_vendors').delete().eq('product_id', productId)

  if (vendors.length > 0) {
    const { error: insertErr } = await supabase.from('product_vendors').insert(
      vendors.map((v) => ({
        product_id: productId,
        vendor_name: String(v.vendor_name ?? '').trim(),
        vendor_type: v.vendor_type ?? 'other',
        amount_type: v.amount_type === 'percentage' ? 'percentage' : 'fixed',
        amount: Number(v.amount ?? 0),
        percentage: Number(v.percentage ?? 0),
        currency: v.currency ?? 'PKR',
        notes: v.notes?.trim() || null,
      }))
    )
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
