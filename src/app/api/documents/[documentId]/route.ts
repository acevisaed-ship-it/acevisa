import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activityLog'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ documentId: string }> }

// PATCH /api/documents/[documentId] — mark an uploaded document verified (or
// back to uploaded). Any active staff member (counselor, admin, or CEO — all
// rows in `counselors`) can act, since a document lives on the client and
// stays reachable regardless of who it's currently assigned to.
export async function PATCH(request: Request, { params }: Params) {
  const staff = await getAuthenticatedCounselor()
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { documentId } = await params
  const { status } = await request.json()

  if (!['uploaded', 'verified'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('id, client_id, document_name, status')
    .eq('id', documentId)
    .single()

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const { data: updated, error } = await supabase
    .from('documents')
    .update({ status })
    .eq('id', documentId)
    .select('id, document_name, status')
    .single()

  if (error) {
    console.error('Document verify error:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }

  await logActivity({
    clientId: doc.client_id,
    counselorId: staff.id,
    actorRole: staff.role,
    actionType: status === 'verified' ? 'document_verified' : 'document_unverified',
    description: `${status === 'verified' ? 'Verified' : 'Unverified'} document: "${doc.document_name}"`,
    metadata: { documentId },
  })

  return NextResponse.json({ document: updated })
}

// DELETE /api/documents/[documentId] — remove a mistakenly-requested or
// no-longer-needed document (and its uploaded file, if any).
export async function DELETE(_request: Request, { params }: Params) {
  const staff = await getAuthenticatedCounselor()
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { documentId } = await params
  const supabase = createAdminClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('id, client_id, document_name, storage_path')
    .eq('id', documentId)
    .single()

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  if (doc.storage_path) {
    await supabase.storage.from('client-documents').remove([doc.storage_path])
  }

  const { error } = await supabase.from('documents').delete().eq('id', documentId)
  if (error) {
    console.error('Document delete error:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }

  await logActivity({
    clientId: doc.client_id,
    counselorId: staff.id,
    actorRole: staff.role,
    actionType: 'document_deleted',
    description: `Removed document: "${doc.document_name}"`,
    metadata: { documentId },
  })

  return NextResponse.json({ success: true })
}
