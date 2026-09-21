import { requireCeo, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Params = { params: Promise<{ id: string }> }

// In-portal viewer for a CEO knowledge base document -- stays inside the
// (admin) layout (sidebar/header visible) instead of popping the file out
// to a bare new tab on a different domain.
export default async function CeoKnowledgeDocumentViewPage({ params }: Params) {
  await requireCeo()
  const { id } = await params

  const supabase = createAdminClient()
  const { data: doc } = await supabase
    .from('ceo_knowledge_documents')
    .select('title')
    .eq('id', id)
    .single()

  return (
    <main className="flex h-[calc(100vh-1px)] flex-col p-4 md:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link
          href="/admin/knowledge-base"
          className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Knowledge Base
        </Link>
        <h1 className="text-sm font-semibold text-white/80">{doc?.title ?? 'Document'}</h1>
      </div>
      <iframe
        src={`/api/admin/ceo-knowledge-base/${id}/view`}
        title={doc?.title ?? 'Document'}
        className="w-full flex-1 rounded-2xl border border-white/10 bg-white"
      />
    </main>
  )
}
