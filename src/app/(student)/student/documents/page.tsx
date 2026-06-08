import { redirect } from 'next/navigation'
import { CheckCircle2, Clock, Upload } from 'lucide-react'
import { StudentSidebar } from '@/components/student/StudentSidebar'
import { createAdminClient } from '@/lib/supabase/server'
import type { Document, DocumentStatus } from '@/types'

type Props = {
  searchParams: Promise<{ clientId?: string }>
}

function StatusIcon({ status }: { status: DocumentStatus }) {
  switch (status) {
    case 'requested':
      return <Clock size={18} className="text-[#E48328]" />
    case 'uploaded':
      return <Upload size={18} className="text-[#2083B9]" />
    case 'verified':
      return <CheckCircle2 size={18} className="text-[#B7C733]" />
  }
}

function statusLabel(status: DocumentStatus) {
  switch (status) {
    case 'requested':
      return 'Requested'
    case 'uploaded':
      return 'Uploaded'
    case 'verified':
      return 'Verified'
  }
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

        {documentRows.length === 0 ? (
          <p className="mt-6 text-sm text-[#0A3F3A]/70">
            No documents requested yet. Your counselor will let you know when something is needed.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {documentRows.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-3 rounded-2xl border border-[#0A3F3A]/10 bg-white/80 p-4"
              >
                <StatusIcon status={doc.status} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#0A3F3A]">{doc.document_name}</p>
                  <p className="text-sm capitalize text-[#0A3F3A]/60">{statusLabel(doc.status)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
