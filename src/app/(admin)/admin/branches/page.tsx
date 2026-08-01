import { requireCeo } from '@/lib/supabase/server'
import { BranchesManager } from '@/components/admin/BranchesManager'

export default async function AdminBranchesPage() {
  await requireCeo()

  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="text-2xl font-bold text-white">Branches</h1>
      <p className="mt-1 text-sm text-white/60">
        Create branches and assign Branch Managers, counselors, and receptionists to them
        from the Team page.
      </p>
      <div className="mt-6">
        <BranchesManager />
      </div>
    </main>
  )
}
