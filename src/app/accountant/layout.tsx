import { requireAccountant } from '@/lib/supabase/server'
import { AccountantHeader } from '@/components/admin/AccountantHeader'
import { PortalHeartbeat } from '@/components/PortalHeartbeat'

export default async function AccountantLayout({ children }: { children: React.ReactNode }) {
  const accountant = await requireAccountant()

  return (
    <div className="min-h-screen bg-grad-teal">
      <PortalHeartbeat />
      <AccountantHeader name={accountant.name} />
      <main className="mx-auto max-w-7xl px-4 py-8 md:py-12">{children}</main>
    </div>
  )
}
