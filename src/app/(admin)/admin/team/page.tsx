import Link from 'next/link'
import { Mail, Phone, ArrowRight } from 'lucide-react'
import { AssignTaskButton } from '@/components/admin/AssignTaskButton'
import { TeamManagement } from '@/components/admin/TeamManagement'
import { CounselorAccountsPanel } from '@/components/admin/CounselorAccountsPanel'
import { getBranchManagersWithCounts } from '@/lib/admin/getBranchManagersWithCounts'
import { getCounselorsWithCounts } from '@/lib/admin/getCounselorsWithCounts'
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
              <article
                key={counselor.id}
                className="flex flex-col rounded-2xl border border-white/10 glass-card crisp-on-dark p-5"
              >
                <h3 className="text-lg font-bold text-white">{counselor.name}</h3>
                <div className="mt-3 space-y-1.5 text-sm text-white/60">
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-white/40" />
                    {counselor.email}
                  </p>
                  {counselor.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0 text-white/40" />
                      {counselor.phone}
                    </p>
                  )}
                </div>
                <p className="mt-4 text-sm font-medium text-white/70">
                  {counselor.clientCount} client{counselor.clientCount === 1 ? '' : 's'}
                  <span className="mx-2 text-white/20">|</span>
                  {counselor.openTaskCount} open task{counselor.openTaskCount === 1 ? '' : 's'}
                </p>
                <Link
                  href={`/admin/counselors/${counselor.id}/dashboard`}
                  className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-grad-blue crisp-on-dark px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  View Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <AssignTaskButton targetId={counselor.id} targetName={counselor.name} />
              </article>
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
