import { createAdminClient } from '@/lib/supabase/server'

/** Counselor's own percentage rate for a product, snapshotted at incentive write time. */
export async function counselorRateForProduct(
  counselorId: string,
  productId: string | null
): Promise<number> {
  const supabase = createAdminClient()

  if (productId) {
    const { data: productRules } = await supabase
      .from('product_commission_rules')
      .select('counselor_id, role, commission_type, commission_value')
      .eq('product_id', productId)

    const personal = (productRules ?? []).find((r) => r.counselor_id === counselorId)
    const roleDefault = (productRules ?? []).find(
      (r) => r.counselor_id == null && r.role === 'counselor' && r.commission_type === 'percentage'
    )
    const rule = personal ?? roleDefault
    if (rule && rule.commission_type === 'percentage') {
      return Number(rule.commission_value)
    }
  }

  const { data: general } = await supabase
    .from('commission_rules')
    .select('commission_rate')
    .eq('counselor_id', counselorId)
    .maybeSingle()
  if (general?.commission_rate != null) return Number(general.commission_rate)

  const { data: staff } = await supabase
    .from('counselors')
    .select('commission_rate')
    .eq('id', counselorId)
    .maybeSingle()
  return Number(staff?.commission_rate ?? 0)
}
