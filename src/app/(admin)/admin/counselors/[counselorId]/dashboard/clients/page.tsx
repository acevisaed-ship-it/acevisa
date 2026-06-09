import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ counselorId: string }>
}

export default async function AdminCounselorClientsPage({ params }: Props) {
  const { counselorId } = await params
  redirect(`/admin/counselors/${counselorId}/dashboard/pipeline`)
}
