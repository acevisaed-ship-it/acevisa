import { requireAdmin } from '@/lib/supabase/server'
import { TermsEditor } from '@/components/admin/TermsEditor'

export default async function AdminTermsPage() {
  const admin = await requireAdmin()
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Invoice terms &amp; policies</h1>
        <p className="mt-1 text-sm text-white/60">
          Draft and publish terms of service and per-product policies. Only a CEO can publish. Old
          versions are never edited.
        </p>
      </div>
      <TermsEditor isCeo={admin.role === 'ceo'} />
    </main>
  )
}
