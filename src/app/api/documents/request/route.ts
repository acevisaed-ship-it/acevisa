import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activityLog'

export async function POST(request: Request) {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId, documentName } = await request.json()
  if (!clientId || !documentName?.trim()) {
    return NextResponse.json({ error: 'clientId and documentName required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify the client belongs to this counselor (or counselor is admin)
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const { data: doc, error } = await supabase
    .from('documents')
    .insert({
      client_id: clientId,
      document_name: documentName.trim(),
      status: 'requested',
    })
    .select('id, document_name, status')
    .single()

  if (error) {
    console.error('Document request error:', error)
    return NextResponse.json({ error: 'Failed to create document request' }, { status: 500 })
  }

  await logActivity({
    clientId,
    counselorId: counselor.id,
    actionType: 'document_requested',
    description: `Counselor requested document: "${documentName.trim()}"`,
    metadata: { documentId: doc.id },
  })

  return NextResponse.json({ document: doc })
}
