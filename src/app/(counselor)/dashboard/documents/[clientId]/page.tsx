import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ clientId: string }>
}

// This route predates the Documents Checklist that now lives directly on
// the client profile page (src/components/brief/DocumentsChecklistSection)
// — request, upload, verify, and download all happen there so documents
// stay reachable regardless of which counselor a client is assigned to.
// Keep this URL working (old links, bookmarks) by sending it to the real
// location instead of showing a dead placeholder.
export default async function CounselorDocumentsPage({ params }: Props) {
  const { clientId } = await params
  redirect(`/dashboard/clients/${clientId}`)
}
