import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activityLog'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data: complaint } = await supabase
    .from('complaints')
    .select('id, client_id, subject, status')
    .eq('id', id)
    .single()

  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
  }

  if (complaint.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('counselor_id')
      .eq('id', complaint.client_id)
      .single()

    if (client?.counselor_id !== counselor.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { error } = await supabase
    .from('complaints')
    .update({
      status: 'acknowledged',
      acknowledged_by: counselor.id,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Complaint acknowledge error:', error)
    return NextResponse.json({ error: 'Failed to acknowledge complaint.' }, { status: 500 })
  }

  if (complaint.client_id) {
    await logActivity({
      clientId: complaint.client_id,
      counselorId: counselor.id,
      actionType: 'complaint_acknowledged',
      description: `Counselor acknowledged complaint: "${complaint.subject}"`,
      metadata: { complaintId: id },
    })
  }

  return NextResponse.json({ success: true })
}
