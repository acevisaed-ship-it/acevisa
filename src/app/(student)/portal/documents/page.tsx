import { redirect } from 'next/navigation'

type Props = {
  searchParams: Promise<{ clientId?: string }>
}

export default async function PortalDocumentsPage({ searchParams }: Props) {
  const { clientId } = await searchParams
  if (!clientId) redirect('/')
  redirect(`/student/documents?clientId=${clientId}`)
}
