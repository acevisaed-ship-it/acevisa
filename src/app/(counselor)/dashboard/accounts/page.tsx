import { MyAccountsPanel } from '@/components/dashboard/MyAccountsPanel'

export default function MyAccountsPage() {
  return (
    <main className="flex-1 p-6 md:p-8">
      <h1 className="mb-1 text-2xl font-semibold text-white md:text-3xl">Accounts</h1>
      <p className="mb-6 text-sm text-white/60">Create invoices for your clients and record the payments you receive.</p>
      <MyAccountsPanel />
    </main>
  )
}
