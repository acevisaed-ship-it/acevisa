import { requireCeo } from '@/lib/supabase/server'
import { ActivityLogView } from '@/components/admin/ActivityLogView'

// CEO-only global feed: every logged action across every branch and role
// (admin, counselor, receptionist), including staff-only events with no
// associated client (logins, account creation, etc). Reuses the same
// activity_logs table and view as /admin/activity, which stays branch-scoped
// for Branch Managers.
export default async function AdminStaffActivityPage() {
  await requireCeo()

  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="text-2xl font-bold text-white">Staff Activity</h1>
      <p className="mt-1 text-sm text-white/60">
        Every action across all branches — admins, counselors, and receptionists.
      </p>
      <div className="mt-6">
        <ActivityLogView />
      </div>
    </main>
  )
}
