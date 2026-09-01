import { AssignTaskButton } from '@/components/admin/AssignTaskButton'
import { CounselorCard } from '@/components/admin/CounselorCard'
import { TeamManagement } from '@/components/admin/TeamManagement'
import { CounselorAccountsPanel } from '@/components/admin/CounselorAccountsPanel'
import { getBranchManagersWithCounts } from '@/lib/admin/getBranchManagersWithCounts'
import { getCounselorsWithCounts } from '@/lib/admin/getCounselorsWithCounts'
import { getTeamPanelMetrics } from '@/lib/admin/getTeamPanelMetrics'
import { requireAdmin, isBranchScoped } from '@/lib/supabase/server'

async function BranchManagersSection() {
  const branchManagers = await getBranchManagersWithCounts()
  return (
    <div>
      <h2 className="text-xl font-semibold text-white">Branch Managers</h2>
      <p className="mt-1 text-sm text-white/60">
        {branchManagers.length} active branch manager{branchManagers.length === 1 ? '' : 's'}
      </p>
      {branchManagers.length === 0 ? (
        <p className="mt-6 text-sm text-white/50">No branch managers found.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branchManagers.map((bm) => (
            <article
              key={bm.id}
              className="flex flex-col rounded-2xl border border-white/10 glass-card crisp-on-dark p-5"
            >
              <h3 className="text-lg font-bold text-white">{bm.name}</h3>
              {bm.branchName && <p className="text-xs text-white/40">{bm.branchName}</p>}
              <p className="mt-3 text-sm text-white/60">{bm.email}</p>
              {bm.phone && <p className="text-sm text-white/60">{bm.phone}</p>}
              <p className="mt-4 text-sm font-medium text-white/70">
                {bm.openTaskCount} open task{bm.openTaskCount === 1 ? '' : 's'}
              </p>
              <AssignTaskButton targetId={bm.id} targetName={bm.name} />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default async function AdminTeamPage() {
  const admin = await requireAdmin()
  const counselors = await getCounselorsWithCounts(isBranchScoped(admin) ? admin.branch_id : undefined)
  const metrics = await getTeamPanelMetrics(counselors.map((c) => c.id))

  return (
    <main className="flex-1 p-4 md:p-8 space-y-10">
      <TeamManagement />

      <hr className="border-white/10" />

      {/* Counselors */}
      <div>
        <h2 className="text-xl font-semibold text-white">Counselors</h2>
        <p className="mt-1 text-sm text-white/60">
          {counselors.length} active counselor{counselors.length === 1 ? '' : 's'}
        </p>
        {counselors.length === 0 ? (
          <p className="mt-6 text-sm text-white/50">No active counselors found.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {counselors.map((counselor) => (
              <CounselorCard
                key={counselor.id}
                counselor={counselor}
                metrics={metrics.get(counselor.id)}
              />
            ))}
          </div>
        )}
      </div>

      {admin.role === 'ceo' && (
        <>
          <hr className="border-white/10" />
          <BranchManagersSection />
        </>
      )}

      <hr className="border-white/10" />
      <CounselorAccountsPanel isCeo={admin.role === 'ceo'} />
    </main>
  )
}
