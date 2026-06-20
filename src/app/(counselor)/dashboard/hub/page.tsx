import { redirect } from 'next/navigation'
import { getAuthenticatedCounselor } from '@/lib/supabase/server'
import { TeamHub } from '@/components/team/TeamHub'

export default async function CounselorHubPage() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) redirect('/login')

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Team Hub</h1>
        <p className="mt-1 text-sm text-white/60">Chat and bulletin board for the ACE team</p>
      </div>
      <TeamHub currentUserId={counselor.id} />
    </main>
  )
}
