import { requireCeoApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BUCKET = 'ceo-knowledge-base'
const SIGNED_URL_TTL_SECONDS = 300 // 5 minutes — regenerated on every view

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/ceo-knowledge-base/[id]/view — CEO only. Redirects to a
// short-lived signed URL so the private bucket is never exposed directly.
export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireCeoApi()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data: doc } = await supabase
    .from('ceo_knowledge_documents')
    .select('storage_path')
    .eq('id', id)
    .single()

  if (!doc?.storage_path) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SECONDS)

  if (signError || !signed?.signedUrl) {
    console.error('CEO knowledge base signed URL error:', signError)
    return NextResponse.json({ error: 'Failed to generate view link' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
