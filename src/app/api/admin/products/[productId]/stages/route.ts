import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ productId: string }> }

// Replace all stages for a product (full overwrite for simplicity)
export async function POST(req: Request, { params }: Params) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { productId } = await params
  const { stages } = await req.json()

  if (!Array.isArray(stages)) {
    return NextResponse.json({ error: 'stages array required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Delete existing, re-insert
  await supabase.from('product_payment_stages').delete().eq('product_id', productId)

  if (stages.length > 0) {
    const { error: insertErr } = await supabase.from('product_payment_stages').insert(
      stages.map((s, i) => ({
        product_id: productId,
        stage_order: i + 1,
        stage_name: String(s.stage_name ?? `Stage ${i + 1}`).trim(),
        amount_type: s.amount_type === 'percentage' ? 'percentage' : 'fixed',
        amount: Number(s.amount ?? 0),
        percentage: Number(s.percentage ?? 0),
        due_trigger: s.due_trigger ?? 'manual',
        notes: s.notes?.trim() || null,
      }))
    )
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
