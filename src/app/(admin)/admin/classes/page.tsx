import { requireAdmin } from '@/lib/supabase/server'
import { ClassesManager } from '@/components/admin/ClassesManager'

export default async function AdminClassesPage() {
  const admin = await requireAdmin()

  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="text-2xl font-bold text-white">Classes</h1>
      <p className="mt-1 text-sm text-white/60">
        IELTS and other language/test-prep batches. Reception enrolls students and marks daily
        attendance here — that attendance shows up on the student&apos;s own profile.
      </p>
      <div className="mt-6">
        <ClassesManager isCeo={admin.role === 'ceo'} defaultBranchId={admin.branch_id ?? null} />
      </div>
    </main>
  )
}
