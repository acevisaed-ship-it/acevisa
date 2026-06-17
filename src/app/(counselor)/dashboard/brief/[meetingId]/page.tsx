import { notFound, redirect } from 'next/navigation'
import { createAdminClient, getAuthenticatedCounselor } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ meetingId: string }>
}

// Brief page now redirects to the unified client record page.
// Everything that was on the brief (psychological analysis, strategy assistant,
// documents, talking points) is now on /dashboard/clients/[clientId].
export default async function BriefPage({ params }: Props) {
  const { meetingId } = await params
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) return null

  const supabase = createAdminClient()

  const { data: meeting } = await supabase
    .from('meetings')
    .select('client_id')
    .eq('id', meetingId)
    .single()

  if (!meeting) notFound()

  redirect(`/dashboard/clients/${meeting.client_id}`)
}
