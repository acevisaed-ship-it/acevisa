import { requireAdmin } from '@/lib/supabase/server'
import { TeamHub } from '@/components/team/TeamHub'

export default async function AdminHubPage() {
  const admin = await requireAdmin()

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Team Hub</h1>
        <p className="mt-1 text-sm text-white/60">Chat and bulletin board for the ACE team</p>
      </div>
      <TeamHub
        currentUserId={admin.id}
        canRemovePosts={admin.role === 'admin' || admin.role === 'ceo'}
      />
    </main>
  )
}
