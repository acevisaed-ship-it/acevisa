import { InactiveRequestsPanel } from '@/components/admin/InactiveRequestsPanel'

export default function InactiveRequestsPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="text-2xl font-semibold text-white md:text-3xl">Inactive Requests</h1>
      <p className="mt-1 text-sm text-text/60">
        Counselors ask to mark a client inactive (or reactivate one) here. Only the CEO can approve.
      </p>
      <div className="mt-6">
        <InactiveRequestsPanel />
      </div>
    </main>
  )
}
