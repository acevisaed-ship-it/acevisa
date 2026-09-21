import { requireCeoApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BUCKET = 'ceo-knowledge-base'

type Params = { params: Promise<{ id: string }> }

// DELETE /api/admin/ceo-knowledge-base/[id] — CEO only.
export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireCeoApi()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data: doc } = await supabase
    .from('ceo_knowledge_documents')
    .select('id, storage_path')
    .eq('id', id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  if (doc.storage_path) {
    await supabase.storage.from(BUCKET).remove([doc.storage_path])
  }

  const { error: deleteError } = await supabase.from('ceo_knowledge_documents').delete().eq('id', id)
  if (deleteError) {
    console.error('CEO knowledge base delete error:', deleteError)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
