import { requireReceptionist } from '@/lib/supabase/server'
import { ReceptionistHeader } from '@/components/receptionist/ReceptionistHeader'
import { PortalHeartbeat } from '@/components/PortalHeartbeat'

export default async function ReceptionistLayout({ children }: { children: React.ReactNode }) {
  const receptionist = await requireReceptionist()

  return (
    <div className="min-h-screen bg-grad-teal">
      <PortalHeartbeat />
      <ReceptionistHeader name={receptionist.name} />
      <main className="mx-auto max-w-2xl px-4 py-8 md:py-12">{children}</main>
    </div>
  )
}
