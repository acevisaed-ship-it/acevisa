import { redirect } from 'next/navigation'
import { StudentSidebar } from '@/components/student/StudentSidebar'
import { createAdminClient } from '@/lib/supabase/server'
import type { Document } from '@/types'
import { DocumentUploadItem } from '@/components/student/DocumentUploadItem'

type Props = {
  searchParams: Promise<{ clientId?: string }>
}

export default async function StudentDocumentsPage({ searchParams }: Props) {
  const { clientId } = await searchParams
  if (!clientId) redirect('/')

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .single()

  if (!client) redirect('/')

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  const documentRows = (documents ?? []) as Document[]

  return (
    <div className="flex min-h-screen">
      <StudentSidebar clientId={clientId} />
      <main className="flex-1 px-4 py-6 pt-20 lg:px-8 lg:pt-8">
        <h1 className="text-2xl font-semibold text-[#0A3F3A]">My Documents</h1>
        <p className="mt-1 text-sm text-[#0A3F3A]/60">
          Upload requested documents below. Max 10 MB per file — PDF, Word, or image.
        </p>

        {documentRows.length === 0 ? (
          <p className="mt-6 text-sm text-[#0A3F3A]/70">
            No documents requested yet. Your counselor will let you know when something is needed.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {documentRows.map((doc) => (
              <DocumentUploadItem key={doc.id} doc={doc} clientId={clientId} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
