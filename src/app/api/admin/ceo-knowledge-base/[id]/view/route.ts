import { requireCeoApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BUCKET = 'ceo-knowledge-base'

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/ceo-knowledge-base/[id]/view — CEO only. Streams the file
// content directly from this route (same origin as the portal) rather than
// redirecting to a Supabase Storage URL, so it can be embedded in an
// in-portal viewer page (iframe) instead of popping out to a different
// domain in a new tab.
export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireCeoApi()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data: doc } = await supabase
    .from('ceo_knowledge_documents')
    .select('storage_path, mime_type')
    .eq('id', id)
    .single()

  if (!doc?.storage_path) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(doc.storage_path)

  if (downloadError || !fileBlob) {
    console.error('CEO knowledge base download error:', downloadError)
    return NextResponse.json({ error: 'Failed to load document' }, { status: 500 })
  }

  const arrayBuffer = await fileBlob.arrayBuffer()

  return new NextResponse(arrayBuffer, {
    headers: {
      'Content-Type': doc.mime_type || 'text/html',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=60',
    },
  })
}
