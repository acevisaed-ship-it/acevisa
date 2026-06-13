import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ documentId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { documentId } = await params
  const supabase = createAdminClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path, document_name')
    .eq('id', documentId)
    .single()

  if (!doc?.storage_path) {
    return NextResponse.json({ error: 'No file uploaded for this document' }, { status: 404 })
  }

  const { data: signed, error } = await supabase.storage
    .from('client-documents')
    .createSignedUrl(doc.storage_path, 60 * 10) // 10-minute link

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl, name: doc.document_name })
}
