import { CorrectionRequestsPanel } from '@/components/admin/CorrectionRequestsPanel'

export default function CorrectionRequestsPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="text-2xl font-semibold text-white md:text-3xl">Client Corrections</h1>
      <p className="mt-1 text-sm text-text/60">
        Receptionists request information changes here. Approve a request so they can update the client record.
      </p>
      <div className="mt-6">
        <CorrectionRequestsPanel />
      </div>
    </main>
  )
}
