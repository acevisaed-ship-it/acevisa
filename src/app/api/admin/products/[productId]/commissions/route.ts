import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ productId: string }> }

export async function POST(req: Request, { params }: Params) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { productId } = await params
  const { rules } = await req.json()

  if (!Array.isArray(rules)) {
    return NextResponse.json({ error: 'rules array required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  await supabase.from('product_commission_rules').delete().eq('product_id', productId)

  if (rules.length > 0) {
    const { error: insertErr } = await supabase.from('product_commission_rules').insert(
      rules.map((r) => ({
        product_id: productId,
        counselor_id: r.counselor_id || null,
        role: r.role ?? 'closer',
        commission_type: r.commission_type === 'fixed' ? 'fixed' : 'percentage',
        commission_value: Number(r.commission_value ?? 0),
        applies_to_stage: r.applies_to_stage ? Number(r.applies_to_stage) : null,
        notes: r.notes?.trim() || null,
      }))
    )
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
