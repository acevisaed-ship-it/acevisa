import { redirect } from 'next/navigation'

type Props = {
  searchParams: Promise<{ clientId?: string }>
}

export default async function StudentPortalPage({ searchParams }: Props) {
  const { clientId } = await searchParams
  if (!clientId) redirect('/')
  redirect(`/student/chat?clientId=${clientId}`)
}
