import { logActivity } from '@/lib/activityLog'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { clientId, action } = await request.json() as {
    clientId?: string
    action?: 'suspend' | 'reactivate'
  }

  if (!clientId || !action) {
    return NextResponse.json({ error: 'clientId and action are required' }, { status: 400 })
  }

  const newStatus = action === 'suspend' ? 'suspended' : 'active'
  const supabase = createAdminClient()

  // Admin can suspend anyone; counselor can only suspend own clients
  const query = supabase
    .from('clients')
    .update({ status: newStatus })
    .eq('id', clientId)

  if (counselor.role !== 'admin') {
    query.eq('counselor_id', counselor.id)
  }

  const { data, error } = await query.select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Client not found or not authorized' }, { status: 404 })
  }

  await logActivity({
    clientId,
    counselorId: counselor.id,
    actionType: action === 'suspend' ? 'account_suspended' : 'account_reactivated',
    description: action === 'suspend'
      ? `Account suspended by ${counselor.name}`
      : `Account reactivated by ${counselor.name}`,
  })

  return NextResponse.json({ success: true, status: newStatus })
}
